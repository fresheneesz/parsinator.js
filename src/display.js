const util = require('util')
const colors = require("colors")
const InputInfoCache = require("./InputInfoCache")


exports.displayResult = function(result, options) {
  options = Object.assign({
    indicatorColor: colors.red,
    colors: true, // To pass to displayDebugInfo.
    inputInfoCache: InputInfoCache(result.context.input), displayDebug: true
  }, options)
  if(result.ok) {
    var display = displaySuccess(result, options)
  } else {
    var display = displayError(result, options)
  }

  if(options.displayDebug && result.context.debugRecord !== undefined) {
    display += '\n'+displayDebugInfo(result, {colors:options.colors})
  }
  return display
}

function displaySuccess(result, options) {
  const info = options.inputInfoCache.get(result.context.index-1)
  return "Parsed successfully through line "+info.line+" column "+info.column+'. Result:\n'+
         JSON.stringify(result.value)
}

// Displays an error result.
function displayError(result, options) {
  const outputText = []
  let index = result.context.index
  const failedAtEof = index == result.context.input.length
  if(failedAtEof) {
    index--
  }
  const info = options.inputInfoCache.get(index)
  if(failedAtEof) {
    info.column += 1
  }

  var failMessage = !result.error? "Expected: "+buildExpectedText(result)+"." : ''
  var exceptionMessage = result.error? "Got "+result.error.stack : ''

  const sourceDisplay = buildSourceDisplay(result.context.input, info, options.inputInfoCache)

  outputText.push("Couldn't continue passed line "+info.line+" column "+info.column+". "+failMessage)
  outputText.push(sourceDisplay)
  if(exceptionMessage) outputText.push(exceptionMessage)
  return outputText.join('\n')

  // Returns the list of expected values.
  function buildExpectedText(result) {
    if(result.expected.size === 1) {
      return '"'+Array.from(result.expected)[0]+'"'
    } else if(result.expected.size === 2) {
      const expected = Array.from(result.expected)
      return '"'+expected[0]+'" or "'+expected[1]+'"'
    } else {
      const expected = Array.from(result.expected)
      return '"'+expected.slice(0, -1).join('", "') + '" or "'+expected[expected.length-1]+'"'
    }
  }

  // Creates text that shows the source from a couple lines before to a couple lines after the result.
  // Also prints an indicator pointer that makes it easy to find the correct character pointed out in the result.
  // info - The input info containing the line and column.
  function buildSourceDisplay(input, info, inputInfoCache) {
    const charsInLineNumber = String(info.line+2).length
    const linesAtAndBefore = getNumberedLines(
      input, Math.max(1, info.line-4), info.line, {lineNumberPadding: charsInLineNumber, inputInfoCache}
    )
    const linesAfter = getNumberedLines(
      input, info.line+1, info.line+2, {lineNumberPadding: charsInLineNumber, inputInfoCache}
    )

    return linesAtAndBefore+'\n    '+
           strmult(charsInLineNumber+info.column-1, ' ')+options.indicatorColor('^')
           +(linesAfter? '\n'+linesAfter : '')
  }

  // Gets the lines between startLine and endLine, inclusive, and numbers them with line numbers.
  function getNumberedLines(input, startLine, endLine, options) {
    options = Object.assign({lineNumberPadding: 0}, options)

    const inputDisplayStartIndex = options.inputInfoCache.getLineIndex(startLine)
    let indexAfterEnd = options.inputInfoCache.getLineIndex(endLine+1)
    if(!indexAfterEnd) {
      indexAfterEnd = result.context.input.length
    }

    const lines = input.slice(inputDisplayStartIndex, indexAfterEnd).split('\n')
    // If the last character was just a newline, remove it. Otherwise there'd be an extra line.
    if(lines[lines.length-1] === '') {
      lines.splice(lines.length-1, 1)
    }
    insertLineNumbers(lines, startLine, options.lineNumberPadding)
    return lines.join('\n')
  }

  // Inserts lines numbers into the list of `lines`.
  // zeroLineNumber - the first line number in `lines.
  // charsInLineNumber - The number of characters in the greatest line number (used to ensure proper padding).
  function insertLineNumbers(lines, zeroLineNumber, charsInLineNumber) {
    for(var n=0; n<lines.length; n++) {
      lines[n] = ' '+String(zeroLineNumber + n).padStart(charsInLineNumber, ' ')+' | '+lines[n]
    }
  }
}

const displayDebugInfo = exports.displayDebugInfo = function(result, options) {
  const debugRecord = result.context.debugRecord
  options = Object.assign({
    colors: true, maxMatchChars: 30, maxSubrecordDepth: 75,
    inputInfoCache: InputInfoCache(debugRecord.result.context.input)
  }, options)
  return displayDebugRecord(0, debugRecord, options)
}

function displayDebugRecord(indent, record, options) {
  let green = colors.green
  let red = colors.red
  let gray = colors.gray
  let cyan = colors.cyan
  if(!options.colors) {
    green = red = gray = cyan = (x => x) // noop
  }

  const outputText = []
  if(record.result) {
    const context = record.result.context
    const endIndex = context.index // non-inclusive
    const matchedChars = (endIndex - record.startIndex)
    if(matchedChars <= options.maxMatchChars) {
      var matchedCharsString = JSON.stringify(context.input.slice(record.startIndex, endIndex))
    } else {
      var matchedCharsString = matchedChars+' character'+(matchedChars>1?'s':'')
    }

    const inputInfo = options.inputInfoCache.get(record.startIndex)
    const lineColumnNumbers = gray("["+inputInfo.line+":"+inputInfo.column+"] ")
    if(record.result.ok) {
      var matchedString = lineColumnNumbers+'matched '+matchedCharsString
    } else {
      var matchedString = lineColumnNumbers+'failed '+
                          gray(JSON.stringify(
                            context.input.slice(record.startIndex, record.startIndex+options.maxMatchChars)))
    }

    if(indent >= 3) {
      var intentString = strmult(Math.floor(indent/3), '  |')+strmult(indent%3, ' ')
    } else {
      var intentString = strmult(indent, ' ')
    }

    if(record.result.ok) {
      var color = green
      var stateToDisplay = record.result.context._state
    } else {
      var color = red
      var stateToDisplay = record.startState
    }

    let stateString = ''
    if(stateToDisplay.size > 0) {
      stateString = cyan(' '+mapDisplay(stateToDisplay))
    }

    outputText.push(gray(intentString)+color(record.name+": "+matchedString+stateString))
    if(record.subRecords) for(let n=0; n<record.subRecords.length; n++) {
      const subRecord = record.subRecords[n]
      // This try is here to catch max callstack exceeded errors, which are likely to happen when a corresponding max
      // callstack error happened in a parser.
      try {
        if(indent+1 < options.maxSubrecordDepth) {
          outputText.push(displayDebugRecord(indent+1, subRecord, options))
        } else {
          outputText.push(color("Couldn't print more results, because the maxSubrecordDepth of "+options.maxSubrecordDepth+" was exceeded."))
          break
        }
      } catch(e) {
        if(e.message === 'Maximum call stack size exceeded') {
          outputText.push("Couldn't print more results, because the maximum call stack size was exceeded.")
        } else {
          throw e
        }
      }
    }
  }
  return outputText.join('\n')
}

function mapDisplay(map) {
  var results = []
  for(let [key, value] of map) {
    results.push(key+':'+value)
  }
  return '{'+results.join(', ')+'}'
}

function strmult(multiplier, str) {
  const results = []
  for(let n=0; n<multiplier; n++) {
    results.push(str)
  }
  return results.join('')
}
