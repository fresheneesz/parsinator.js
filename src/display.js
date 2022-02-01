const util = require('util')
const colors = require("colors")
const InputInfoCache = require("./InputInfoCache")


exports.displayResult = function(result) {
  if(result.ok) {
    return "Parsed successfully\n"+util.inspect(result)
  } else {
    return displayError(result)
  }
}

// Displays an error result.
function displayError(result) {
  const outputText = []
  const inputInfoCache = InputInfoCache(result.context.input)
  const info = inputInfoCache.get(result.context.index)

  const expectedText = buildExpectedText(result)
  const sourceDisplay = buildSourceDisplay2(result, inputInfoCache)

  outputText.push(sourceDisplay)
  outputText.push("Couldn't continue passed line "+info.line+" column "+info.column+". Expected: "+expectedText+".")
  return outputText.join('\n')

  // Returns the list of expected values.
  function buildExpectedText(result) {
    if(result.expected.length === 1) {
      return '"'+Array.from(result.expected)[0]+'"'
    } else if(result.expected.length === 2) {
      const expected = Array.from(result.expected)
      return '"'+expected[0]+'" or "'+expected[1]+'"'
    } else {
      const expected = Array.from(result.expected)
      return '"'+expected.slice(0, -1).join('", "') + '" or "'+expected[expected.length-1]+'"'
    }
  }

  function buildSourceDisplay2(result, inputInfoCache) {
    const info = inputInfoCache.get(result.context.index)
    const charsInLineNumber = String(info.line).length
    const firstLineToDisplay = Math.max(1, info.line-4)
    const inputDisplayStartIndex = inputInfoCache.getLineIndex(Math.max(1, firstLineToDisplay))
    let inputDisplayEndIndex = inputInfoCache.getLineIndex(info.line+1)

    const linesAtAndBefore = result.context.input.slice(inputDisplayStartIndex, inputDisplayEndIndex).split('\n')
    // If the last character was just a newline, remove it. Otherwise there'd be an extra line.
    if(linesAtAndBefore[linesAtAndBefore.length-1] === '') {
      linesAtAndBefore.splice(linesAtAndBefore.length-1, 1)
    }
    insertLineNumbers(linesAtAndBefore, firstLineToDisplay, charsInLineNumber)
    let sourceDisplay = linesAtAndBefore.join('\n')+
                        '\n    '+strmult(charsInLineNumber+info.column-1, ' ')+colors.red('^')+'\n'

    // const lineAfterIndex = inputDisplayEndIndex
    // const lineAfterEnd = inputInfoCache.getLineIndex(info.line+2)
    // if(lineAfterEnd) {
    //   let lineAfter = result.context.input.slice(lineAfterIndex, lineAfterEnd)
    //   // If the last character was just a newline, remove it. Otherwise there'd be an extra line.
    //   if(lineAfter.slice(-1) === '\n') {
    //     lineAfter = lineAfter.slice(0, -1)
    //   }
    //   insertLineNumbers(lineAfter, info.line+1, charsInLineNumber)
    //   sourceDisplay += lineAfter
    // }
    return sourceDisplay
  }

  function insertLineNumbers(lines, zeroLineNumber, charsInLineNumber) {
    for(var n=0; n<lines.length; n++) {
      lines[n] = ' '+String(zeroLineNumber + n).padStart(charsInLineNumber, ' ')+' | '+lines[n]
    }
  }
}

exports.displayDebugInfo = function(result) {
  const debugRecord = result.context.debugRecord
  return displayDebugRecord(0, debugRecord)
}

function displayDebugRecord(indent, record, options) {
  const outputText = []
  if(record.result) {
    const context = record.result.context
    if(options === undefined) {
      options = {maxMatchChars: 30, inputInfoCache: InputInfoCache(context.input)}
    }
    const endIndex = context.index // non-inclusive
    const matchedChars = (endIndex - record.startIndex)
    if(matchedChars <= options.maxMatchChars) {
      var matchedCharsString = JSON.stringify(context.input.slice(record.startIndex, endIndex))
    } else {
      var matchedCharsString = matchedChars+' character'+(matchedChars>1?'s':'')
    }
    const inputInfo = options.inputInfoCache.get(record.startIndex)
    const matchedString = colors.gray("["+inputInfo.line+":"+inputInfo.column+"] ")+
                          (record.result.ok ?
                            'matched '+matchedCharsString :
                            'failed '+colors.gray(JSON.stringify(context.input.slice(record.startIndex, 30))))
    if(indent >= 3) {
      var intentString = strmult(Math.floor(indent/3), '  |')+strmult(indent%3, ' ')
    } else {
      var intentString = strmult(indent, ' ')
    }

    if(record.result.ok) {
      var color = colors.green
    } else {
      var color = colors.red
    }

    outputText.push(colors.gray(intentString)+color(record.name+": "+matchedString))
    record.subRecords && record.subRecords.forEach(function(subRecord) {
      outputText.push(displayDebugRecord(indent+1, subRecord, options))
    })
  }
  return outputText.join('\n')
}

function strmult(multiplier, str) {
  const results = []
  for(let n=0; n<multiplier; n++) {
    results.push(str)
  }
  return results.join('')
}
