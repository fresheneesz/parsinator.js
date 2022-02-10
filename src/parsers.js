// See ../docs/parsers.md for documentation.

const {Parser, isParser, getPossibleParser} = require("./core")

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

exports.str = function(string) {
  return Parser('str('+JSON.stringify(string)+')', function() {
    const start = this.index
    const end = this.index + string.length
    if(this.input.slice(start, end) === string) {
      return this.ok(end, string)
    } else {
      return this.fail(start, [string])
    }
  })
}

exports.regex = function(regexp) {
  for (const flag of regexp.flags) {
    // Flags ignoreCase, dotAll, multiline, and unicode are suppported.
    if (!['i','s','m','u'].includes(flag)) {
      throw new Error("only the regexp flags 'imsu' are supported")
    }
  }
  const sticky = new RegExp(regexp.source, regexp.flags + "y") // Force regex to only match at sticky.lastIndex
  return new Parser('regex('+regexp+')', function() {
    sticky.lastIndex = this.index
    const match = this.input.match(sticky)
    if (match) {
      const end = this.index + match[0].length
      const string = this.input.slice(this.index, end)
      return this.ok(end, string)
    }
    return this.fail(this.index, [regexp.toString()])
  })
}

exports.ser = function(...parsers) {
  if(parsers.length === 0) throw new Error("Call to `ser` passes no parsers.")

  // Normalize any labeled parser and extract labels
  const labels = []
  parsers = parsers.map((parser, n) => {
    if(isParser(parser)) {
      return parser
    } else if(parser instanceof Object && !(parser instanceof Function)) {
      let found = false, parserToReturn
      for(let curLabel in parser) {
        if(found) {
          const objectDisplay = '{'+Object.keys(parser).map((key) => {
            return key+": "+(parser[key].name || JSON.stringify(parser[key]))
          }).join(', ')+'}'
          throw new Error("A ser label object contains multiple labels: "+objectDisplay)
        }
        found = true
        parserToReturn = parser[curLabel]
        if(!isParser(parserToReturn)) {
          throw new Error("ser passed something other than a parser as label '"+curLabel+"': "+parser+".")
        }
        labels[n] = curLabel
      }
      return parserToReturn
    } else {
      throw new Error("ser passed something other than a parser or labeled parser object: "+parser+".")
    }
  })

  return Parser('ser', function() {
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

    return this.ok(lastResult.context.index, results)
  })
}

exports.alt = function(...parsers) {
  if(parsers.length === 0) throw new Error("Call to `ser` passes no parsers.")

  // Validate parsers input.
  parsers = parsers.map((parser) => {
    maybeInvalidParserException('alt', parser)
    return parser
  })

  return Parser('alt', function() {
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
  return _timesInternal('many', parser)
}

exports.atLeast = function(numberOfTimes, parser) {
  return _timesInternal('atLeast', parser, {atLeast: numberOfTimes})
}

exports.atMost = function(numberOfTimes, parser) {
  return _timesInternal('atMost', parser, {atMost: numberOfTimes})
}

exports.times = function(numberOfTimes, parser) {
  if(numberOfTimes === undefined) throw new Error('times not passed a numberOfTimes: '+numberOfTimes)
  return _timesInternal('times('+numberOfTimes+')', parser, {atLeast: numberOfTimes, atMost: numberOfTimes})
}

exports.timesBetween = function(atLeast, atMost, parser) {
  return _timesInternal('timesBetween', parser, {atLeast, atMost})
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

  const maxParses = constraints && constraints.atMost || Infinity
  const minParses = constraints && constraints.atLeast || 0

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
    return this.ok(lastResult.context.index, results)
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

exports.name = function(name, parser) {
  maybeInvalidParserException('name', parser)
  parser.name = name
  return parser
}

// name - The name of the parser this is being called from.
function maybeInvalidParserException(name, parser) {
  if(!isParser(parser)) {
    throw new Error(name+" passed something other than a parser: "+parser)
  }
}