// This is a file for higher-level parsers. These parsers don't even depend directly on core, but are composed of the
// basic parsers in parsers.js. The exports of this file are documented in ../docs/parsers.md

const {Parser, getPossibleParser} = require("./core")
const {ser, many, timesBetween, name} = require("./parsers")

exports.listOf = function(separatorParser, primaryParser, constraints) {
  constraints = constraints || {}
  if(constraints.atLeast) {
    var atLeast2 = constraints.atLeast - 1
  }
  if(constraints.atMost) {
    var atMost1 = constraints.atMost >= 1 ? 1 : 0
    var atMost2 = constraints.atMost - 1
  }

  separatorParser = getPossibleParser(separatorParser)
  primaryParser = getPossibleParser(primaryParser)
  return name(`listOf(${separatorParser.name}, ${primaryParser.name})`,
    ser(
      timesBetween(0, atMost1, primaryParser),
      timesBetween(atLeast2, atMost2,
        ser(separatorParser,{primaryParser})
      ).map(value => value.primaryParser)
    ).value(values => values[0].concat(values[1]))
  )
}

exports.seriesSepBy = function(separatorParser, ...parsers) {
  let lastParser = parsers[0]
  if(parsers.length === 1) return getPossibleParser(parsers[0]).value(value => [value])
  for(let n=1; n<parsers.length; n++) {
    const parser = parsers[n]
    lastParser = lastParser.chain(function() {
      return ser(separatorParser, parser).value(values => values[1])
    })
  }
  return name(`seriesSepBy(${separatorParser}, ...)`, lastParser)
}

exports.memoize = function(parserFunction, options) {
  options = options || {}
  const memory = new Map

  if(parserFunction instanceof Parser) {
    const parser = parserFunction
    return createMemoizedParser(parser, [])
  } else {
    return function() {
      const parser = parserFunction.apply(this, arguments)
      return createMemoizedParser(parser, arguments)
    }
  }

  function createMemoizedParser(parser, args) {
    return Parser('memoize('+parser.name+')', function() {
      const keys = [this.input, this.index].concat(args).concat(getStateMemoizationKeys(this._state))
      const lastMemoryLevel = lookupMemoryLastLevel(memory, keys.slice(-1))
      const lastKey = keys[keys.length-1]
      const memoryResult = lastMemoryLevel.get(lastKey)
      if(memoryResult) {
        return this.ok(memoryResult.index, memoryResult.value)
      } else {
        const result = this.parse(parser, this)
        // Note that you don't want to store the whole result because that contains a context that might contain a
        // different input. If the result was stored and returned directly, it could cause a parser run on a different input
        // (where the memoized functions happen to match at the same index), it would *change* the input. Which would
        // be bad.
        lastMemoryLevel.set(lastKey, {index: result.context.index, value: result.value})
        return result
      }
    })
  }

  function lookupMemoryLastLevel(memory, keys) {
    let curMemoryLevel = memory
    keys.forEach(key => {
      let memoryLevel = curMemoryLevel.get(key)
      if(!memoryLevel) {
        memoryLevel = new Map
        curMemoryLevel.set(key, memoryLevel)
      }
      curMemoryLevel = memoryLevel
    })
    return curMemoryLevel
  }

  // Returns all the keys used in the memoization memory in a normalized repeatable format.
  function getStateMemoizationKeys(state) {
    var keys = getStateKeys(state).sort()
    var result = []
    keys.forEach(key => {
      result.push(key)
      result.push(state.get(key))
    })
    return result
  }

  // Returns all relevant state keys.
  function getStateKeys(state) {
    let keys = Array.from(state.keys())
    if(options.relevantStatekeys) {
      return keys.filter(key => {
        return options.relevantStatekeys.includes(key)
      })
    }
    return keys
  }
}
