const {Parser} = require("./core")

// Matches the end of input, returns undefined.
exports.eof = function() {
  return Parser('eof', function() {
    if(this.index >= this.input.length) {
      return this.ok(this.index)
    } else {
      return this.fail(this.index, ["EOF"])
    }
  })
}

// Returns a parser that consumes no input and returns a result.
exports.ok = function(result) {
  return Parser('ok', function() {
    return this.ok(this.index, result)
  })
}

// Returns a parser that consumes no input and fails with an expectation or whatever.
exports.fail = function(expected) {
  return Parser('fail', function() {
    return this.fail(this.index, expected)
  })
}

// Matches a string.
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


// Matches a regular expression at the current index.
exports.match = function(regexp) {
  for (const flag of regexp.flags) {
    // Flags ignoreCase, dotAll, multiline, and unicode are suppported.
    if (!['i','s','m','u'].includes(flag)) {
      throw new Error("only the regexp flags 'imsu' are supported")
    }
  }
  const sticky = new RegExp(regexp.source, regexp.flags + "y") // Force regex to only match at sticky.lastIndex
  return new Parser('match('+regexp+')', function() {
    sticky.lastIndex = this.index
    const match = this.input.match(sticky)
    if (match) {
      const end = this.index + match[0].length
      const string = this.input.slice(this.index, end)
      return this.ok(end, string)
    }
    return this.fail(this.index, [regexp.toString()])
  });
}

// Runs a series of parsers in sequence.
// Each argument can either be:
// * A Parser object, or
// * An object with a single key-value pair, where the key is a label and the value is a Parser object to run.
//   If any argument is a key-value pair object like that, the result will be a key-value pair object with
//   keys matching each argument's key and each value will be the value returned by the parser. Unlabeled parsers
//   won't have their result values included in the result value of the ser parse. For example,
//   `ser({a: str('a')}, str('b'))` would have the result `{a: 'a'}` if it succeeded.
exports.ser = function(...parsers) {
  if(parsers.length === 0) throw new Error("Call to `ser` passes no parsers.")

  return Parser('ser', function() {
    // Normalize any labeled parser and extract labels
    const labels = []
    parsers = parsers.map((parser, n) => {
      if(parsers[n] instanceof Parser) {
        return parser
      } else if(parsers[n] instanceof Function || !(parsers[n] instanceof Object)) {
        throw new Error("ser passed something other than a parser or labeled parser object: "+parsers[n]+".")
      } else {
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
          labels[n] = curLabel
        }
        return parserToReturn
      }
    })

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
          results[labels[n]] = result.value
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

// Expects the parser to match `numberOfTimes` in a series.
exports.times = function(numberOfTimes, parser) {
  return _timesInternal('times', parser, {atLeast: numberOfTimes, atMost: numberOfTimes})
}

// Expects the parser to match at least `numberOfTimes` in a series.
exports.atLeast = function(numberOfTimes, parser) {
  return _timesInternal('atLeast', parser, {atLeast: numberOfTimes})
}

// Allows a parser to match at most `numberOfTimes` in a series.
exports.atMost = function(numberOfTimes, parser) {
  return _timesInternal('atMost', parser, {atMost: numberOfTimes})
}

// Allows a parser to match between `atLeast` and `atMost` times in a series.
exports.timesBetween = function(atLeast, atMost, parser) {
  return _timesInternal('timesBetween', parser, {atLeast, atMost})
}

// Allows a parser to match 0 or more times in a series.
exports.many = function(parser) {
  return _timesInternal('many', parser)
}

// Runs a parser a number of times with some constraints.
function _timesInternal(
  name, // A string name for the parser.
  parser, // A Parser.
  constraints // An object with the following properties:
              // * atLeast - (Optional) Fails if the parser doesn't match this many times.
              // * atMost - (Optional) Limits the number of matches to this number.
) {
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

// Returns a parser that returns true if the passed in parser doesn't match.
// Doesn't return a value and doesn't advance the index.
exports.not = function(parser) {
  return Parser('not', function() {
    const result = this.parse(parser, this)
    if(result.ok) {
      return this.fail(this.index, ['not '+this.input.slice(this.index, result.index)])
    } else {
      return this.ok(this.index)
    }
  })
}

// Returns a parser that consumes no input and fails with an expectation or whatever.
exports.peek = function(parser) {
  return Parser('peek', function() {
    const result = this.parse(parser, this)
    if(result.ok) {
      return this.ok(this.index, result.value)
    } else {
      return result
    }
  })
}
