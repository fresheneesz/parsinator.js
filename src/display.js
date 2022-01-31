const colors = require("colors")
const FileInfoCache = require("../src/FileInfoCache")


// Displays the result
exports.displayError = function(result) {
  const info = FileInfoCache(result.context.input).get(result.context.index)
  if(result.expected.length === 1) {
    var expectedText = '"'+Array.from(result.expected)[0]+'"'
  } else if(result.expected.length === 2) {
    const expected = Array.from(result.expected)
    var expectedText = '"'+expected[0]+'" or "'+expected[1]+'"'
  } else {
    const expected = Array.from(result.expected)
    // var expectedText = Array.from(result.expected).join('", "')
    var expectedText = '"'+expected.slice(0, -1).join('", "') + '" or "'+expected[expected.length-1]+'"'
  }

  console.log("Couldn't continue passed line "+info.line+" column "+info.column+". Expected: "+expectedText+".")
}

exports.displayDebugInfo = function(result) {
  const debugRecord = result.context.debugRecord
  displayDebugRecord(0, debugRecord)
}

function displayDebugRecord(indent, record, options) {
  if(record.result) {
    const context = record.result.context
    if(options === undefined) {
      options = {maxMatchChars: 30, inputInfoCache: FileInfoCache(context.input)}
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

    console.log(colors.gray(intentString)+color(record.name+": "+matchedString))
    record.subRecords && record.subRecords.forEach(function(subRecord) {
      displayDebugRecord(indent+1, subRecord, options)
    })
  }
}

function strmult(multiplier, str) {
  const results = []
  for(let n=0; n<multiplier; n++) {
    results.push(str)
  }
  return results.join('')
}