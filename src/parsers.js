// See ../docs/parsers.md for documentation.

const {Parser, InternalError} = require("./core")
const {isParser, getPossibleParser, maybeInvalidParserException} = require('./basicParsers')

exports.any = function() {
  return Parser('any', function() {
    if(this.index < this.input.length) {
      return this.ok(this.index + 1, this.input[this.index])
    } else {
      return this.fail(this.index, ["any"])
    }
  })
}

exports.eof = function() {
  return Parser('eof', function() {
    if(this.index >= this.input.length) {
      return this.ok(this.index)
    } else {
      return this.fail(this.index, ["EOF"])
    }
  })
}

exports.ok = function(value) {
  return Parser('ok', function() {
    return this.ok(this.index, value)
  })
}

exports.fail = function(expected) {
  return Parser('fail', function() {
    return this.fail(this.index, expected)
  })
}

exports.range = function(begin, end) {
  return Parser(`range(${begin},${end})`, function() {
    const ch = this.input[this.index]
    if (begin <= ch && ch <= end) {
      return this.ok(this.index+1, ch)
    } else {
      return this.fail(this.index, [`${begin}-${end}`])
    }
  })
}

exports.ser = function(...parsers) {
  if(parsers.length === 0) throw new Error("Call to `ser` passes no parsers.")
  if(parsers.length === 1) return getParserInfo(parsers[0]).parser

  // Normalize any labeled parser and extract labels
  const labels = []
  parsers = parsers.map((parser, n) => {
    const info = getParserInfo(parser)
    if (info.label) {
      labels[n] = info.label
    }
    return info.parser
  })

  const name = `ser(${parsers.map(p => p.name).join(', ')})`
  return Parser(name, function() {
    let results
    if(labels.length === 0) {
      results = []
    } else {
      results = {}
    }

    let curContext = this, lastResult;
    for(let n=0; n<parsers.length; n++) {
      const parser = parsers[n]
      const result = this.parse(parser, curContext)
      if(result.ok) {
        if(labels.length === 0) {
          results.push(result.value)
        } else {
          if(labels[n]) results[labels[n]] = result.value
        }

        lastResult = result
        curContext = result.context
      } else {
        return result
      }
    }

    return lastResult.context.ok(lastResult.context.index, results)
  })
  
  // Gets the parser from a ser input (which can be a Parser or a lable-map).
  function getParserInfo(value) {
    if(isParser(value)) {
      return {parser: getPossibleParser(value)}
    } else if (serParserIsLabelMap(value)) {
      assertLabelMapIsValid(value)
      for (const label in value) {
        const parserToReturn = value[label]
        if(!isParser(parserToReturn)) {
          throw new InternalError("ser passed something other than a parser as label '"+label+"': "+parserToReturn+".")
        }
        return {label, parser: getPossibleParser(parserToReturn)}
      }
    } else {
      throw new InternalError("ser passed something other than a parser or labeled parser object: "+value+".")
    }
  }
  
  // Returns true if the value is a label-map object for ser
  function serParserIsLabelMap(value) {
    return value instanceof Object && !(value instanceof Function) && !(value instanceof RegExp)
  }
  
  function assertLabelMapIsValid(labelMap) {
    let found = false
    for (const key in labelMap) {
        if(found) {
          const objectDisplay = '{'+Object.keys(labelMap).map((key) => {
            return key+": "+(getPossibleParser(labelMap[key]).name || JSON.stringify(labelMap[key]))
          }).join(', ')+'}'
          throw new Error("A ser label object contains multiple labels: "+objectDisplay+".")
        }
        found = true
    }
  }
}

exports.alt = function(...parsers) {
  // Validate parsers input and normalize them.
  parsers = parsers.map((parser) => {
    maybeInvalidParserException('alt', parser)
    return getPossibleParser(parser)
  })
  
  if(parsers.length === 0) throw new Error("Call to `ser` passes no parsers.")
  if(parsers.length === 1) return getPossibleParser(parsers[0])

  const name = `alt(${parsers.map(p => p.name).join(', ')})`
  return Parser(name, function() {
    let expected = new Set, furthest = this.index
    for(let n=0; n<parsers.length; n++) {
      const parser = parsers[n]
      const result = this.parse(parser, this)
      if(result.ok) {
        return result
      } else {
        expected = new Set([...expected, ...result.expected])
        if(result.context.index > furthest) {
          furthest = result.context.index
        }
      }
    }

    return this.fail(furthest, expected)
  })
}

exports.many = function(parser) {
  parser = getPossibleParser(parser)
  return _timesInternal('many('+parser.name+')', parser)
}

exports.atLeast = function(numberOfTimes, parser) {
  parser = getPossibleParser(parser)
  return _timesInternal('atLeast('+numberOfTimes+','+parser.name+')', parser, {atLeast: numberOfTimes})
}

exports.atMost = function(numberOfTimes, parser) {
  parser = getPossibleParser(parser)
  return _timesInternal('atMost('+numberOfTimes+','+parser.name+')', parser, {atMost: numberOfTimes})
}

exports.times = function(numberOfTimes, parser) {
  parser = getPossibleParser(parser)
  if(numberOfTimes === undefined) throw new Error('times not passed a numberOfTimes: '+numberOfTimes)
  return _timesInternal('times('+numberOfTimes+','+parser.name+')', parser, {atLeast: numberOfTimes, atMost: numberOfTimes})
}

exports.timesBetween = function(atLeast, atMost, parser) {
  return _timesInternal('timesBetween('+atLeast+'-'+atMost+','+parser.name+')', parser, {atLeast, atMost})
}

// Runs a parser a number of times with some constraints.
function _timesInternal(
  name, // A string name for the parser.
  parser, // A Parser.
  constraints // An object with the following properties:
              // * atLeast - (Optional) Fails if the parser doesn't match this many times.
              // * atMost - (Optional) Limits the number of matches to this number.
) {
  maybeInvalidParserException(name, parser)

  const maxParses = constraints?.atMost || Infinity
  const minParses = constraints?.atLeast || 0

  return Parser(name, function() {
    const results = []
    let curContext = this, lastResult
    for(let n=0; n<maxParses; n++) {
      const result = this.parse(parser, curContext)
      if(result.ok) {
        results.push(result.value)
        lastResult = result
        curContext = result.context
      } else {
        if(results.length < minParses) {
          let indexContext = lastResult? lastResult.context : curContext
          // Improve this error message (expectation?)
          return this.fail(indexContext.index, result.expected)
        } else {
          lastResult = result
          break
        }
      }
    }
    return lastResult.context.ok(lastResult.context.index, results)
  })
}

exports.not = function(parser) {
  maybeInvalidParserException('not', parser)
  return Parser('not', function() {
    const result = this.parse(parser, this)
    if(result.ok) {
      return this.fail(this.index, ['not '+this.input.slice(this.index, result.index)])
    } else {
      return this.ok(this.index)
    }
  })
}

exports.peek = function(parser) {
  maybeInvalidParserException('peek', parser)
  return Parser('peek', function() {
    const result = this.parse(parser, this)
    if(result.ok) {
      return this.ok(this.index, result.value)
    } else {
      return result
    }
  })
}

exports.desc = function(name, parser) {
  const parserName = 'desc('+name+')'
  maybeInvalidParserException(parserName, parser)
  return Parser(parserName, function() {
    const result = this.parse(parser, this)
    if(result.ok) {
      return result
    } else {
      return this.fail(this.index, [name])
    }
  })
}

exports.node = function(name, parser) {
  const thisParserName = 'node('+name+')'
  maybeInvalidParserException(thisParserName, parser)
  parser = getPossibleParser(parser)
  return Parser(thisParserName, function() {
    const start = this.index
    const transformedParser = parser.value(function(value) {
      return {name, value, start, end:this.index}
    })
    return this.parse(transformedParser, this)
  })
}