// This is a file for higher-level parsers. These parsers don't even depend directly on core, but are composed of the
// basic parsers in parsers.js. The exports of this file are documented in ../docs/parsers.md

const {Parser} = require("./core")
const {isParser, getPossibleParser, name} = require('./basicParsers')
const {ser, timesBetween} = require("./parsers")

exports.listOf = function(/*[options], separatorParser, primaryParser*/) {
  if(isParser(arguments[0])) {
    var options = {}
    var separatorParser = getPossibleParser(arguments[0])
    var primaryParser = getPossibleParser(arguments[1])
  } else {
    var options = arguments[0]
    var separatorParser = getPossibleParser(arguments[1])
    var primaryParser = getPossibleParser(arguments[2])
  }

  if(options.ignoreSep === undefined) options.ignoreSep = true
  if(options.atLeast) {
    var atLeast2 = options.atLeast - 1
  }
  if(options.atMost) {
    var atMost1 = options.atMost >= 1 ? 1 : 0
    var atMost2 = options.atMost - 1
  }

  return name(`listOf(${separatorParser.name}, ${primaryParser.name})`,
    ser(
      timesBetween(0, atMost1, primaryParser),
      timesBetween(atLeast2, atMost2,
        ser(separatorParser,primaryParser).value(value => options.ignoreSep ? [value[1]] : value)
      ).value(lists => {
        let flattenedList = []
        lists.forEach(list => flattenedList = flattenedList.concat(list))
        return flattenedList
      })
    ).value(values => values[0].concat(values[1]))
  )
}

exports.series = function(options, ...parsers) {
  if(options.ignoreSep === undefined) options.ignoreSep = true
  parsers = parsers.map(parser => getPossibleParser(parser))

  let lastParser = parsers[0].value(v => [v]) // Every other value in the chain will be a list, so this should be too.
  if(options.wrap) lastParser = options.wrap(lastParser)

  if(parsers.length === 1) return getPossibleParser(lastParser)
  for(let n=1; n<parsers.length; n++) {
    let parser = parsers[n]
    lastParser = lastParser.chain(function(v) {
      if(options.wrap) parser = options.wrap(parser)
      if(options.sepBy) {
        return ser(options.sepBy, parser).value(values => options.ignoreSep ? [values[1]]: values).value(v2 => v.concat(v2))
      } else {
        return parser.value(v2 => v.concat(v2))
      }
    })
  }
  return name(`series`, lastParser.value(lists => {
    let flattenedList = []
    lists.forEach(list => flattenedList = flattenedList.concat(list))
    return flattenedList
  }))
}

exports.memoize = function(parserFunction, options) {
  options = options || {}
  const memory = new Map

  if(isParser(parserFunction)) {
    const parser = getPossibleParser(parserFunction)
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