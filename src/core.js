const proto = require("proto")

const internal = {} // Indicates internal to prevent misuse.

const ParseResult = proto(function() {
  this.init = function() {
      ;[this.ok, // Either true or false.
        this.context, // The Context that the parser parsed to. When this.ok is false, this indicates the furthest
                      // it was able to parse.
        this.value, // The success value returned by the parser, if this.ok is true.
        this.expected, // A Set of expected parser matches if this.ok is false.
        this.error, // An exception, if one happened while running in debug mode. This should only possibly exist
                    // if this.ok is false.
      ] = arguments
  }

  this.copy = function() {
    return ParseResult(this.ok, this.context, this.value, this.expected, this.error)
  }
})

// A Context represents a location in an input string, passed along state that parsers can read and write to,
// and in the case of debugging holds a record of the entire parsing session. Giving a parser a context will cause it
// to parse from the Context's index.
const Context = proto(function() {
  this.init = function() {
    ;[this.input, // The string source being parsed.
      this.index, // The current index the parser is at in the input.
      this._state,  // A Map of named values set by parsers.
      this.debug // If true, the context creates debug records.
    ] = arguments

    if(this._state === undefined) {
      this._state = new Map()
    }
  }

  // Returns a new context where its `index` has been moved ahead.
  this.move = function(index) {
    if(index < this.index) {
      throw new Error("Parser attempted to move an index backward to index: "+index+" from index"+this.index+".")
    }
    const newContext = Context(this.input, index, new Map(this._state), this.debug)
    if(this.debug) {
      newContext.debugRecord = this.debugRecord
    }
    return newContext
  }

  // Returns a copy of the context.
  this.copy = function() {
    return this.move(this.index)
  }

  // Indicates the parse succeeded and returns a value from the parser.
  this.ok = function(
    index, // The new 'next' index. The parser succeeded up through the previous index.
    value  // The resulting value to return from the parser.
  ) {
    return ParseResult(true, this.move(index), value)
  }

  // Indicates the parse failed and records error information.
  this.fail = function(
    index, // The farthest index it was able to successfully parse to. The parser
           // succeeded up through the previous index.
    expected // A list (Array or Set) of strings where each string is a failed expectation to be
            // displayed to the user in a list like "Expected to find ..., ..., and ... in the input".
  ) {
    if(!(expected instanceof Set)) {
      if(!(expected instanceof Array)) expected = [expected]
      expected = new Set(expected)
    }
    return ParseResult(false, this.move(index), undefined, expected)
  }

  // Gets a state value.
  this.get = function(key) {
    return this._state.get(key)
  }

  // Sets a state value.
  this.set = function(key, value) {
    this._state.set(key, value)
  }

  // Runs a sub parser (a parser that is "part of" or a child parser of the parser this context came from).
  // parser - The parser to continue parsing with.
  // curContext - The context to continue parsing from.
  this.parse = function(parser, curContext) {
    if(this === curContext) {
      curContext = this.copy()
    }
    if(curContext.debug) {
      this.createNewDebugSubrecord(curContext)
    }
    return parser.parse(curContext, internal)
  }

  // == Debug-related methods ==

  // Initializes a new debug record.
  this.initDebug = function() {
    const newRecord = {}
    this.debugRecord = newRecord
    this.curDebugSection = newRecord
    this.debug = true
  }

  // Creates a new debug subrecord in this Context, the target of the subrecord being owned by the passed Context.
  // Note that this expects curContext to not already have a debugRecord or curDebugSubsection.
  this.createNewDebugSubrecord = function(curContext) {
    if(this.curDebugSection.subRecords === undefined) {
      this.curDebugSection.subRecords = []
    }
    curContext.debugRecord = this.debugRecord
    curContext.curDebugSection = {}
    this.curDebugSection.subRecords.push(curContext.curDebugSection)
  }

  // Adds debug info available before parsing has started.
  this.addDebugParseInit = function(name, startIndex) {
    this.curDebugSection.name = name
    this.curDebugSection.startIndex = startIndex
  }

  // Adds the result to the debug record.
  this.addDebugResult = function(result) {
    this.curDebugSection.result = result
  }
})

const Parser = proto(function() {
  this.init = function() {
    ;[this.name,
      this.action, // A function that returns a ParseResult.
      this.chainContinuations, // A list of continuations registered by `chain`.
    ] = arguments
    if(this.chainContinuations === undefined) this.chainContinuations = []
  }

  // Returns a ParseResult.
  this.parse = function(
    // One of:
    // * input // A string input.
    // * context // A Context to continue from.
  ) {
    if(typeof(arguments[0]) !== 'string' && !(arguments[0] instanceof Context)) {
      throw new Error("Argument passed to parse is neither a string nor a Context object.")
    }
    const isInternal = arguments[1] === internal
    if(arguments[0] instanceof Context && !isInternal) {
      throw new Error("If you're calling Parser.parse inside another parser, please use" +
                      " this.parse(parser, context) instead for debuggability.")
    }

    let context
    if(arguments[0] instanceof Context) {
      context = arguments[0]
    } else {
      const input = arguments[0]
      context = Context(input, /*index */ 0)
      if(this.shouldDebug) {
        context.initDebug()
      }
    }

    let chainContinuations = this.chainContinuations
    const isChain = this.chainContinuations.length !== 0
    if(isChain) {
      if(context.debug) context.addDebugParseInit("chain", context.index)
      chainContinuations = [() => Parser(this.name, this.action)].concat(chainContinuations)
      return maybeTryCatch(context, isInternal, () => {
        const result = runContinuations(context, chainContinuations)
        // This ends up being the result of the entire chain.
        if(context.debug) context.addDebugResult(result)
        return result
      })
    } else {
      if(context.debug) context.addDebugParseInit(this.name, context.index)
      return maybeTryCatch(context, isInternal, () => {
        const result = this.action.apply(context)
        if(context.debug) context.addDebugResult(result)
        return result
      })
    }
  }

  // Runs an action that should return a ParseResult and catches and propagates errors properly.
  function maybeTryCatch(context, isInternal, action) {
    if(context.debug) {
      try {
        return action()
      } catch(e) {
        // The idea here is that any exception that happens should be caught, recorded in the debug
        // record, and re-thrown to propagate it up and returned as a top-level error result.
        // An uncaught exception is not a normal parse failure and it basically should be
        // treated like a critical failure.
        if(e instanceof InternalError) {
          var result = e.result
        } else {
          var result = ParseResult(false, context, undefined, ['no error'], e)
        }
        context.addDebugResult(result)
        if(isInternal) {
          throw InternalError(result)
        } else {
          return result
        }
      }
    } else {
      return action()
    }
  }

  // Runs a set of continuations in the form passed to `chain`.
  // Returns the result of the chain.
  function runContinuations(context, chainContinuations) {
    const resultValues = []
    let prevResult = {ok:true, context: context} // Set up fake previous result.
    for(let n=0; n<chainContinuations.length; n++) {
      if(prevResult.ok) {
        const continuation = chainContinuations[n]
        const parser = continuation(prevResult.value)
        if(!(parser instanceof Parser)) throw new Error("Function passed to `then` did not return a parser. The function is: "+continuation.toString())
        prevResult = context.parse(parser, prevResult.context)
        resultValues.push(prevResult.value)
      } else {
        break
      }
    }

    const result = prevResult.copy()
    result.value = resultValues
    return ParseResult(prevResult.ok, prevResult.context, resultValues, prevResult.expected, prevResult.error)
  }

  // Access the value returned by the parser this is called on and returns a new parser to continue from.
  // If the parser returns an ok ParseResult, calls `continuation` to get the next parser to continue parsing from.
  // continuation(value) - Should return a Parser.
  this.chain = function(continuation) {
    return Parser(this.name, this.action, this.chainContinuations.concat(continuation))
  }

  // mapper(value) - A function that receive the value parsed by the calling parser and returns a new value
  //                 to replace that value. If the previous parser does not succeed, map doesn't modify the ParseResult.
  this.map = function(mapper) {
    const parser = this
    return Parser('map', function() {
      const result = this.parse(parser, this)
      if(result.ok) {
        return this.ok(result.context.index, mapper(result.value))
      } else {
        return result
      }
    })
  }

  // Sets whether or not this Parser is in debug mode.
  this.debug = function(shouldDebug) {
    if(shouldDebug === undefined) shouldDebug = true
    this.shouldDebug = shouldDebug
    return this
  }
})

// An error that holds a ParseResult.
const InternalError = proto(Error, function() {
  this.init = function(result) {
    this.result = result
  }
})

module.exports = {Parser}