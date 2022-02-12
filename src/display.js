// The exports of this file are documented in ../docs/display.md

const util = require('util')
const proto = require("proto")
const colors = require("colors")


exports.displayResult = function(result, options) {
  options = Object.assign({
    colors: true, // To pass to displayDebugInfo.
    indicatorColor: colors.red,
    inputInfoCache: InputInfoCache(result.context.input), displayDebug: true,
    /*stateDisplay: undefined*/ // To pass to displayDebugInfo.
  }, options)
  options.indicatorColor = options.colors? options.indicatorColor : text => text

  let display = ''
  if(options.displayDebug && result.context.debugRecord !== undefined) {
    const optionsToPass = {colors:options.colors}
    if(options.stateDisplay) optionsToPass.stateDisplay = options.stateDisplay
    display = displayDebugInfo(result, optionsToPass)+'\n'
  }


  if(result.ok) {
    display += displaySuccess(result, options)
  } else {
    display += displayError(result, options)
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
    const expected = Array.from(result.expected).map(value => JSON.stringify(value))
    if(result.expected.size === 1) {
      return expected[0]
    } else if(result.expected.size === 2) {
      return expected[0]+' or '+expected[1]
    } else {
      return expected.slice(0, -1).join(', ') + ' or '+expected[expected.length-1]
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
  return displayDebugRecord(0, debugRecord, options)
}

function displayDebugRecord(indent, record, options) {
  options = Object.assign({
    colors: true, maxMatchChars: 30, maxSubrecordDepth: 75,
    inputInfoCache: InputInfoCache(record.result.context.input),
    stateDisplay: stateDisplay
  }, options)

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

    let stateString = ''
    if(record.result.ok) {
      var color = green
      var endState = record.result.context._state
      if(endState.size > 0) {
        stateString = cyan(' '+options.stateDisplay(record.startState, endState))
      }
    } else {
      var color = red
      if(record.startState.size > 0) {
        stateString = red(' '+options.stateDisplay(record.startState))
      }
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

  // Returns a string that displays the give maps.
  // startState - A Map.
  // endState - A Map or undefined if only the startState should be displayed.
  function stateDisplay(startState, endState) {
    if(endState) {
      return mapDiffDisplay(startState, endState)
    } else {
      return mapDisplay(startState)
    }
  }

  // Returns a string that displays the passed Map.
  function mapDisplay(map) {
    var results = []
    for(let [key, value] of map) {
      results.push(key+':'+value)
    }
    return '{'+results.join(', ')+'}'
  }

  // Returns a string that displays the difference between the passed Maps.
  function mapDiffDisplay(startState, endState) {
    const diff = mapDiff(startState, endState)

    var results = []
    for(let [key, value] of diff) {
      if(value.start === undefined) {
        results.push(key+':->'+value.end)
      } else {
        results.push(key+':'+value.start+'->'+value.end)
      }
    }

    if(results.length === 0) {
      return '{'+gray('*no change*')+'}'
    } else {
      return '{'+results.join(', ')+'}'
    }
  }

  // Returns a map that contains only the key-value pairs that are different between them. Each value will be
  // an object like {start: _, end: _} showing the change of value.
  function mapDiff(start, end) {
    const keys = Array.from(new Set(Array.from(start.keys()).concat(Array.from(end.keys()))))
    const result = new Map
    new Map(keys.forEach(key => {
      if(start.get(key) !== end.get(key)) {
        result.set(key, {start: start.get(key), end: end.get(key)})
      }
    }))
    return result
  }
}

function strmult(multiplier, str) {
  const results = []
  for(let n=0; n<multiplier; n++) {
    results.push(str)
  }
  return results.join('')
}


const InputInfoCache = exports.InputInfoCache = proto(function LineCache() {
  this.init = function(input) {
    this.input = input
    // A list containing the last index of each 0-based.
    this.cache = []
  }

  this.get = function(index) {
    if(index < 0 || this.input.length < index) {
      throw new Error("Asking for info about an index not contained in the target string: "+index+'.')
    }
    const oneIndexBeyond = this.input.length === index
    const columnAddition = oneIndexBeyond? 1 : 0
    // This is a special case because the input doesn't actually contain this index.
    if(oneIndexBeyond) {
      index--
    }

    let lastLineEndIndex = -1
    for(let zeroBasedLine=0; zeroBasedLine<this.cache.length; zeroBasedLine++) {
      const lineInfo = getLineInfo(index, this.cache, zeroBasedLine, lastLineEndIndex, columnAddition)
      if(lineInfo) {
        return lineInfo
      }
      lastLineEndIndex = this.cache[zeroBasedLine]
    }

    const lineInfo = this.searchUntil((zeroBasedLineNumber, lastLineEndIndex) => {
      return getLineInfo(index, this.cache, zeroBasedLineNumber, lastLineEndIndex, columnAddition)
    })
    if(lineInfo) {
      return lineInfo
    } else {
      throw new Error("Couldn't find line info.")
    }

    // Gets line information for the passed index.
    function getLineInfo(index, cache, zeroBasedLineNumber, lastLineEndIndex, columnAddition) {
      if(index < cache[zeroBasedLineNumber]) {
        return {line: zeroBasedLineNumber+1, column: index-lastLineEndIndex+columnAddition}
      } else if(index === cache[zeroBasedLineNumber]) {
        return {line: zeroBasedLineNumber+1, column: index-lastLineEndIndex+columnAddition}
      }
    }
  }

  // Searches the input until check returns something truthy.
  // startIndex - The line to start searching from.
  // check(lineNumber, lastLineEndIndex)
  this.searchUntil = function(check) {
    let lastLineEndIndex = this.cache[this.cache.length-1] || -1
    const startIndex = lastLineEndIndex+1
    for(let n=startIndex; n<this.input.length; n++) {
      if(this.input[n] === '\n' || n == this.input.length-1) {
        this.cache.push(n)
        const checkResult = check(this.cache.length-1, lastLineEndIndex)
        if(checkResult) {
          return checkResult
        }
        lastLineEndIndex = n
      }
    }
  }

  this.getLineIndex = function(line) {
    if(line === 1) return 0
    line = line-1 // 0 based is easier internally.
    if(this.cache.length < line) {
      this.searchUntil((lineNumber) => {
        return lineNumber === line
      })
    }
    if(line <= this.cache.length) {
      // The start of the line is the end of the previous line plus 1.
      return this.cache[line-1]+1
    }
  }
})