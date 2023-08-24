// This file contains the lowest level of objects in parsinator.js. The code here handles keeping track of the current
// location being parsed, parser state, the resulting values of parsing, chain continuations, and
// debug information gathering. The exports in here are documented in docs/core.md.

const proto = require("proto")
const {isNonFunctionParser, getPossibleParser, name} = require('./basicParsers')

const internal = {} // Indicates internal to prevent misuse.

// The primary class for parsinator.js.
const Parser = exports.Parser = proto(function() {
  this.init = function() {
    ;[this.name,
      this.action, // A function that returns a ParseResult.
      this.chainContinuations, // A list of continuations registered by `chain`. This is intended to only be used internally.
    ] = arguments
    if(!(this.action instanceof Function)) throw new Error("No action passed to Parser constructor")
    if(this.chainContinuations === undefined) this.chainContinuations = []
    this.shouldDebug = false
    this.hideFromDebugRecord = false
  }

  this.parse = function(
    // arguments[0] - One of:
    //                * input // If the argument is a string, it will parse that string from the beginning.
    //                * context // If the argument is a Context, it will parse context.input from context.index. This
    //                             is intended only for internal use.
    // arguments[1] - internal: will be set for internal calls of parse. This is so debug exception propagation can
    //                work properly without allowing outside code to do unexpected things that could cause an exception
    //                to be thrown in the middle of parsing without being recorded properly in the debug log.
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
      context = Context(input, /*index */ 0, new Map(), InputInfoCache(input))
      if(this.shouldDebug) {
        context.initDebug()
      }
    }

    let name = this.name
    let chainContinuations = this.chainContinuations
    const isChain = this.chainContinuations.length !== 0
    if(isChain) {
      name = "chain"
      chainContinuations = [() => {
        const chainedParser = Parser(this.name, this.action)
        chainedParser.shouldDebug = this.shouldDebug
        chainedParser.hideFromDebugRecord = this.hideFromDebugRecord
        return chainedParser
      }].concat(chainContinuations)
    }
    
    if(context.debug) context.addDebugParseInit(name, context.index, context._state, this.hideFromDebugRecord)
    return maybeTryCatch(this.name, context, isInternal, () => {
      if(isChain) {
        var result = runContinuations(context, chainContinuations)
      } else {
        var result = this.action.apply(context)
      }
      if(context.debug) context.addDebugResult(result)
      return result
    })
    
  }

  // Runs an action that should return a ParseResult and catches and propagates errors properly.
  function maybeTryCatch(name, context, isInternal, action) {
    try {
      return action()
    } catch(e) {
      if(context.debug) {
        // The idea here is that any exception should be caught, recorded in the debug
        // record, and re-thrown to propagate it up and then returned as a top-level error result.
        // An uncaught exception is not a normal parse failure and it basically should be
        // treated like a critical failure.
        if(e instanceof InternalError) {
          var result = e.result
          e = e.result.error
        } else {
          e._parsinatorName = name
          var result = ParseResult(false, context, undefined, ['no error'], e)
          e.result = result
        }
        
        context.addDebugResult(result)
        
        if(isInternal) {
          throw InternalError(result)
        } else {
          throw e
        }
      } else {
        if (!e._parsinatorName) {
          e._parsinatorName = name
          e.message = "In '"+e._parsinatorName+"', "+e.message
        }
        
        throw e
      }
    }
  }

  // Runs a set of continuations in the form passed to `chain`.
  // Returns the result of the chain.
  // As far as the debug record is concerned, this records all chained continuations as subRecord siblings
  // (under the 'chain' record set up in the `parse` code that calls this.
  function runContinuations(context, chainContinuations) {
    let prevResult = {ok:true, context: context} // Set up fake previous result.
    for(let n=0; n<chainContinuations.length; n++) {
      if(prevResult.ok) {
        const continuation = chainContinuations[n]
        if (isNonFunctionParser(continuation)) {
          var parser = getPossibleParser(continuation)
        } else {
          var parser = getPossibleParser(continuation.call(prevResult.context, prevResult.value))
        }
        
        if(!(parser instanceof Parser)) {
          throw new Error("Function passed to `chain` did not return a parser. The function is: "+continuation.toString())
        }
        prevResult = context.parse(parser, prevResult.context)
      } else {
        break
      }
    }

    return prevResult
  }
  
  this.join = function() {
    return this.value(list => joinInternal(list))
    
    function joinInternal(list) {
      if (typeof(list) === 'string') {
        return list 
      }
      if(!(list instanceof Array)) {
          throw new Error("used `join` on a parser result that isn't only a nested array of strings: "+JSON.stringify(list))
      } 
      
      var s = []
      for (const item of list) {
        if(typeof(item) === 'string') {
          s.push(item)
        } else {
          s.push(joinInternal(item))
        }
      }
  
      return s.join('')
    }
  }

  this.chain = function(continuation) {
    // The name of this parser should be the same as the parser chain is being called on, because that will be the name
    // reported for the first leg of the chain.
    const chainedParser = Parser(this.name, this.action, this.chainContinuations.concat(continuation))
    chainedParser.shouldDebug = this.shouldDebug
    chainedParser.hideFromDebugRecord = this.hideFromDebugRecord
    return chainedParser
  }
  
  this.isolate = function(stateMapper) {
    const parser = this
    return hideFromDebug(Parser(this.name, function() {
      const result = this.parse(parser, this.copy())
      const oldState = result.context._state
      const newState = new Map(this._state)
      
      if (stateMapper) stateMapper(oldState, newState)
      result.context._state = newState
      
      return result
    }))
  }
  
  this.isolateFromDebugRecord = function() {
    const parser = this
    return hideFromDebug(Parser(this.name, function() {
      const isolateFromDebugRecord = this.isolateFromDebugRecord
      this.isolateFromDebugRecord = true
      return this.parse(parser.value(function(v) {
        if (!isolateFromDebugRecord) {
          delete this.isolateFromDebugRecord 
        }
        return v
      }), this)
    }))
  }
  
  this.deisolateFromDebugRecord = function() {
    const parser = this
    return hideFromDebug(Parser(this.name, function() {
      const isolateFromDebugRecord = this.isolateFromDebugRecord
      this.isolateFromDebugRecord = false
      return this.parse(parser.value(function(v) {
        if (isolateFromDebugRecord) {
          this.isolateFromDebugRecord = true 
        }
        return v
      }), this)
    }))
  }
  
  this.value = function(valueMapper) {
    const parser = this
    return hideFromDebug(Parser(this.name, function() {
      const result = this.parse(parser, this)
      if(result.ok) {
        result.value = valueMapper.call(result.context, result.value)
      }
      return result
    }))
  }

  this.map = function(mapper) {
    return hideFromDebug(name(this.name, this.value(function(values) {
      const context = this
      return values.map(function() {
        return mapper.apply(context, arguments)
      })
    })))
  }

  this.debug = function(shouldDebug) {
    if(shouldDebug === undefined) shouldDebug = true
    this.shouldDebug = shouldDebug
    return this
  }
})

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
    // this.debugRecord // Can be set in debug mode.
  }

  this.copy = function() {
    return ParseResult(this.ok, this.context, this.value, this.expected, this.error)
  }
})

const Context = proto(function() {
  this.init = function() {
    ;[this.input, // The string source being parsed.
      this.index, // The current index the parser is at in the input.
      this._state,  // A Map of named values set by parsers.
      this.inputInfoCache, // An InputInfoCache
      this.debug, // If true, the context creates debug records.
      this.isolateFromDebugRecord // If set to true, all inner parsers will be hidden from the record.
    ] = arguments
  }

  this.move = function(index) {
    if(index < this.index) {
      throw new Error("Parser attempted to move an index backward to index: "+index+" from index"+this.index+".")
    }
    const newContext = Context(this.input, index, new Map(this._state), this.inputInfoCache, this.debug, this.isolateFromDebugRecord)
    if(this.debug) {
      newContext.debugRecord = this.debugRecord
    }
    return newContext
  }

  this.copy = function() {
    return this.move(this.index)
  }

  this.ok = function(
    index, // The new 'next' index. The parser succeeded up to this index.
    value  // The resulting value to return from the parser.
  ) {
    return ParseResult(true, this.move(index), value)
  }

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

  this.parse = function(parser, curContext) {
    if(!curContext) throw new Error("Context.parse not passed a curContext.")
    parser = getPossibleParser(parser)
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
  this.addDebugParseInit = function(name, startIndex, startState, hideFromDebugRecord) {
    this.curDebugSection.name = name
    this.curDebugSection.startIndex = startIndex
    this.curDebugSection.startState = new Map(startState)
    if (hideFromDebugRecord || this.isolateFromDebugRecord) {
      this.curDebugSection.hideFromDebugRecord = true
    }
  }

  // Adds the result to the debug record.
  this.addDebugResult = function(result) {
    // Copy this so any state changes don't mutate this record.
    this.curDebugSection.result = Object.assign({}, result)
    this.curDebugSection.result.context = result.context.copy()
  }
})

// An error that holds a ParseResult.
const InternalError = exports.InternalError = proto(Error, function() {
  this.init = function(result) {
    this.result = result
  }
})

const hideFromDebug = exports.hideFromDebug = function(parser) {
  parser.hideFromDebugRecord = true
  return parser
}


const InputInfoCache = exports.InputInfoCache = proto(function LineCache() {
  this.init = function(input) {
    this.input = input
    this.initialized = false
  }
  
  this.initialize = function() {
    if (!this.initialized) {
      // A map of 1-based line to the first character index in that line.
      this.lineCache = {1: 0}
      
      let line = 1
      for (let index=0; index<this.input.length; index++) {
        const char = this.input[index]
        if (char === '\n') {
          line++
          this.lineCache[line] = index+1
        }
      }
      
      this.lines = line
      this.initialized = true
    }
  }
  
  // Returns the start index at line.
  this.getLineIndex = function(line) {
    return this.lineCache[line]
  }
  
  this.get = function(index) {
    if(index < 0 || this.input.length < index) {
      throw new Error("Asking for info about an index not contained in the target string: "+index+'.')
    }
    
    let lastLine
    for (let line=1; line<=this.lines; line++) {
      lastLine = line
      const startIndex = this.lineCache[line]
      if (startIndex > index) {
        return {line: line-1, column: 1 + index - this.lineCache[line-1]} 
      }
    }
    return {line: lastLine, column: 1 + index - this.lineCache[lastLine]} 
  }
})