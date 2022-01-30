const proto = require("proto")

const ParserResult = proto(function() {
  this.init = function() {
      ;[this.ok, // Either true or false.
        this.context, // The Context that the parser parsed to.
        this.value, // The success value returned by the parser, if this.ok is true.
        this.expected, // A list of expected parser matches, if this.ok is false.
      ] = arguments
  }
})

const Context = proto(function() {
  this.init = function() {
    ;[this.input, // The string source being parsed.
      this.index, // The current index the parser is at in the input.
      this._state  // A Map of named values set by parsers.
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
    return Context(this.input, index, new Map(this._state))
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
    expected // A list of strings where each string is a failed expectation to be
            // displayed to the user in a list like "Expected to find ..., ..., and ... in the input".
  ) {
    if(!(expected instanceof Array)) {
      expected = [expected]
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
})

const Parser = proto(function() {
  this.init = function() {
    ;[this.action, // A function that returns a ParserResult. A Context object will be set as its `this`.
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

    let context;
    if(arguments[0] instanceof Context) {
      context = arguments[0]
    } else {
      const input = arguments[0]
      context = Context(input, /*index */ 0)
    }

    const result = this.action.apply(context)
    if(this.chainContinuations) {
      const results = []
      let curResult = result
      for(let n=0; n<this.chainContinuations.length; n++) {
        if(curResult.ok) {
          const continuation = this.chainContinuations[n]
          const parser = continuation(curResult.value)
          if(!(parser instanceof Parser)) throw new Error("Function passed to `then` did not return a parser. The function is: "+continuation.toString())
          curResult = parser.parse(curResult.context)
        } else {
          break
        }
      }
      return curResult
    } else {
      return result
    }
  }

  // Access and modifies the ParseResult of the parser this is called on.
  // If the parser returns an ok ParserResult, calls `continuation` to get the next parser to continue parsing from.
  // continuation(value) - Should return a Parser.
  this.chain = function(continuation) {
    return Parser(this.action, this.chainContinuations.concat(continuation))
  }
})

module.exports = {Parser}