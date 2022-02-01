const proto = require("proto")

const internal = 45 // Magic number that indicates internal. Don't use this externally.

const ParserResult = proto(function() {
  this.init = function() {
      ;[this.ok, // Either true or false.
        this.context, // The Context that the parser parsed to.
        this.value, // The success value returned by the parser, if this.ok is true.
        this.expected, // A Set of expected parser matches, if this.ok is false.
      ] = arguments
  }
})

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
    return ParserResult(true, this.move(index), value)
  }

  // Indicates the parse failed and records error information.
  this.fail = function(
    index, // The farthest index it was able to successfully parse to. The parser
           // succeeded up through the previous index.
    expected // A list (Array or Set) of strings where each string is a failed expectation to be
            // displayed to the user in a list like "Expected to find ..., ..., and ... in the input".
  ) {
    if(!(expected instanceof Set)) {
      expected = new Set(expected)
    }
    return ParserResult(false, this.move(index), undefined, expected)
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
      if(this.curDebugSection.subRecords === undefined) {
        this.curDebugSection.subRecords = []
      }
      curContext.debugRecord = this.debugRecord
      curContext.curDebugSection = {}
      this.curDebugSection.subRecords.push(curContext.curDebugSection)
    }
    return parser.parse(curContext, internal)
  }

  // Initializes a new debug record.
  this.initDebug = function() {
    const newRecord = {}
    this.debugRecord = newRecord
    this.curDebugSection = newRecord
    this.debug = true
  }

  this.addDebugParseInit = function(name, startIndex) {
    this.curDebugSection.name = name
    this.curDebugSection.startIndex = startIndex
  }

  this.addDebugResult = function(result) {
    this.curDebugSection.result = result
  }
})

const Parser = proto(function() {
  this.init = function() {
    ;[this.name,
      this.action, // A function that returns a ParserResult. A Context object will be set as its `this`.
      this.chainContinuations, // A list of continuations registered by `chain`.
    ] = arguments
    if(this.chainContinuations === undefined) this.chainContinuations = []
  }

  // Returns a ParserResult.
  this.parse = function(
    // One of:
    // * input // A string input.
    // * context // A Context to continue from.
  ) {
    if(typeof(arguments[0]) !== 'string' && !(arguments[0] instanceof Context)) {
      throw new Error("Argument passed to parse is neither a string nor a Context object.")
    }
    if(arguments[0] instanceof Context && arguments[1] !== internal) {
      throw new Error("If you're calling Parser.parse inside another parser, please use" +
                      " this.parse(parser, context) instead for debuggability.")
    }

    let context;
    if(arguments[0] instanceof Context) {
      context = arguments[0]
    } else {
      const input = arguments[0]
      context = Context(input, /*index */ 0)
      if(this.shouldDebug) {
        context.initDebug()
      }
    }

    const willChain = this.chainContinuations.length !== 0
    if(context.debug) {
      const name = willChain ? "chain" : this.name
      context.addDebugParseInit(name, context.index)
    }
    if(willChain) {
      var result = context.parse(Parser(this.name, this.action), context)
    } else {
      var result = this.action.apply(context)
    }

    if(context.debug && !willChain) {
      context.addDebugResult(result)
    }

    let curResult = result
    for(let n=0; n<this.chainContinuations.length; n++) {
      if(curResult.ok) {
        const continuation = this.chainContinuations[n]
        const parser = continuation(curResult.value)
        if(!(parser instanceof Parser)) throw new Error("Function passed to `then` did not return a parser. The function is: "+continuation.toString())
        curResult = context.parse(parser, curResult.context)
      } else {
        break
      }
    }
    if(context.debug && willChain) {
      context.addDebugResult(curResult)
    }
    return curResult
  }

  // Access and modifies the ParseResult of the parser this is called on.
  // If the parser returns an ok ParserResult, calls `continuation` to get the next parser to continue parsing from.
  // continuation(value) - Should return a Parser.
  this.chain = function(continuation) {
    return Parser(this.name, this.action, this.chainContinuations.concat(continuation))
  }

  // Sets whether or not this Parser is in debug mode.
  this.debug = function(shouldDebug) {
    if(shouldDebug === undefined) shouldDebug = true
    this.shouldDebug = shouldDebug
    return this
  }
})

module.exports = {Parser}