var {Parser} = require("../src/core")
const {isParser, getPossibleParser} = require('../src/basicParsers')


module.exports = [

  
  

  //*
  {name: 'ok parser', run: function(){
    const results = []
    var parser = Parser('parser', function() {
      results.push(this.index === 0)
      results.push(this.input === 'testString')
      let parseResult = this.ok(2, 'resultValue')
      results.push(parseResult.ok === true)
      results.push(parseResult.context.index === 2)
      results.push(parseResult.context.input === 'testString')
      results.push(parseResult.value === 'resultValue')
      results.push(this.index === 0)
      return parseResult
    })
    const parseResult = parser.parse('testString')

    results.push(
      parseResult.context.index === 2 &&
      parseResult.context.input === 'testString' &&
      parseResult.value === 'resultValue')
    return results
  }, result: [
    true, true, true, true, true, true, true, true,
  ]},

  {name: 'fail parser', run: function(){
    const results = []
    var parser = Parser('parser', function() {
      results.push(this.index === 0)
      results.push(this.input === 'testString')
      let parseResult = this.fail(3, ['a', 'b', 'c'])
      results.push(parseResult.ok === false)
      results.push(parseResult.context.index === 3)
      results.push(parseResult.context.input === 'testString')
      results.push(parseResult.expected)
      results.push(this.index === 0)
      return parseResult
    })
    const parseResult = parser.parse('testString')

    results.push(
      parseResult.context.index === 3 &&
      parseResult.context.input === 'testString')
    return results
  }, result: [
    true, true, true, true, true, new Set(['a', 'b', 'c']), true, true
  ]},

  {name: 'fail expected parameter promotes to array', run: function(){
    var parser = Parser('parser', function() {
      return this.fail(3, 'a')
    })
    return parser.parse('testString')
  }, result: {
    expected: new Set(['a'])
  }},

  {name: 'chain', run: function(){
    const results = []
    let firstParseResult
    var parser = Parser('parser', function() {
      this.set('x', 3)
      firstParseResult = this.ok(4, 'a')
      return firstParseResult
    }).chain(function(value) {
      results.push(value === firstParseResult.value)
      results.push(this.get('x') === 3)
      return Parser('parser', function() {
        results.push(this.get('x') === 3)
        results.push(this.index === firstParseResult.context.index)
        return this.ok(5, 'b')
      })
    })
    results.push(parser.parse('testString'))
    return results
  }, result: [
    true, true, true, true, {ok: true, value: 'b', context: {index: 5}}
  ]},

  {name: 'result', run: function(){
    var parser = Parser('parser', function() {
      this.set('x', 3)
      return this.ok(4, 'a')
    }).value(function(value) {
      return value+' state '+this.get('x')+' modified '+
             this.index // result should have access to the current context.
    })
    return parser.parse('testString')
  }, result: {
    ok: true, value: 'a state 3 modified 4', context: {index: 4, _state: new Map([['x', 3]])}
  }},

  {name: 'result error', run: function(){
    var parser = Parser('parser', function() {
      return this.fail(4, ['a'])
    }).value(function(value) {
      return value+'modified'
    })
    return parser.parse('testString')
  }, result: {
    ok: false, value: undefined, context: {index: 4}, expected: new Set(['a'])
  }},

  {name: 'map', run: function(){
    var parser = Parser('parser', function() {
      this.set('x', 3)
      return this.ok(4, [1,2,3])
    }).map(function (value, n) {
      return value+' '+this.get('x')+' '+n+' '+
             this.index // map should have access to the current context.
    })
    return parser.parse('testString')
  }, result: {
    ok: true, value: ['1 3 0 4', '2 3 1 4', '3 3 2 4'], context: {index: 4, _state: new Map([['x', 3]])}
  }},

  {name: 'map error', run: function(){
    var parser = Parser('parser', function() {
      return this.fail(4, ['a'])
    }).value(function(value) {
      return value+'modified'
    })
    return parser.parse('testString')
  }, result: {
    ok: false, value: undefined, context: {index: 4}, expected: new Set(['a'])
  }},

  {name: 'map not passed array', run: function(){
    var parser = Parser('parser', function() {
      return this.fail(4, 'a')
    }).value(function(value) {
      return value+'modified'
    })
    return parser.parse('testString')
  }, result: {
    ok: false, value: undefined, context: {index: 4}, expected: new Set(['a'])
  }},

  {name: 'join', run: function() {
    var parser = Parser('parser', function() {
      return this.ok(4, ['a', ['b'], [['c'], 'd']])
    }).join()
    return parser.parse('testString')
  }, result: {
    ok: true, value: 'abcd'
  }},

  {name: 'join on simple string', run: function() {
    var parser = Parser('parser', function() {
      return this.ok(4, "string")
    }).join()
    return parser.parse('testString')
  }, result: {
    ok: true, value: 'string'
  }},

  {name: 'ok parser state', run: function(){
    const results = []
    var parser = Parser('parser', function() {
      // Note that state should only be set if the parser succeeds. On the other end, in case a parser
      // doesn't follow that rule, parsers that
      // try multiple parsers until one succeeds should pass copies of the context.
      let success = true
      if(success) {
        this.set('a', 1)
        return this.ok(2, 'resultValue')
      }
    })
    const parseResult = parser.parse('testString')

    results.push(parseResult.context.get('a') === 1)
    return results
  }, result: [
    true
  ]},

  {name: 'Parser wrong input', 
    run: function(){
      Parser('parser', 'wrong')
    }, 
    exception: "No action passed to Parser constructor"
  },

  {name: 'Parser.parse wrong input', 
    run: function(){
      Parser('parser', function() {}).parse(1)
    }, 
    exception: "Argument passed to parse is neither a string nor a Context object."
  },
  
  // isolate
  {name: 'Parser.isolate', run: function(){
    const initState = Parser('parser', function() {
      this.set('a', 'no')
      this.set('b', 'no')
      return this.ok(1, 'A')
    })
    const modifyState = Parser('parser', function() {
      this.set('a', 'yes')
      this.set('b', 'yes')
      return this.ok(1, 'B')
    })
    const readState = Parser('parser', function() {
      return this.ok(1, this.get('a')+this.get('b'))
    })
      
    const parser = initState.chain(v => 
      modifyState.isolate(function(oldState, newState) {
        newState.set('b', oldState.get('b')) 
      }).value(
        v2 => [v].concat([v2]))
    ).chain(v => 
      readState.value(v2 => 
        v.concat([v2]))
    )
    
    const parseResult = parser.parse("abc")
      
    const results = parseResult.value
    results.push(parseResult.context.get('a') === 'no')
    results.push(parseResult.context.get('b') === 'yes')
      
    return results
  }, result: [
    'A','B','noyes', true, true
  ]},
  
  // Debugger
  
  {name: 'debugger: basic output', run: function(){
    var parser = Parser('parser', function() {
      return this.ok(2, 'resultValue')
    })
    return parser.debug().parse('ignored').context.debugRecord
  }, result: {
    name: 'parser', startIndex: 0, result: {ok: true, context:{index:2}, value: 'resultValue'}
  }},

  {name: 'debugger: fail output', run: function(){
    var parser = Parser('parser', function() {
      this.set('a', 1)
      return this.fail(1, ['x','y','z'])
    })
    return parser.debug().parse('ignored').context.debugRecord
  }, result: {
    name: 'parser', startIndex: 0, result: {ok: false, context:{index:1, _state:new Map([['a',1]])}, expected: new Set(['x','y','z'])}
  }},

  {name: 'debugger: output for alternatives', run: function(){
    var x = Parser('x', function() {
      this.set('a', 1)
      return this.fail(0, ['x'])
    })
    var y = Parser('y', function() {
      this.set('a', 2)
      return this.ok(1, 'y')
    })
    var parser = Parser('parser', function() {
      this.set('a', 0)
      this.parse(x, this)
      return this.parse(y, this)
    })
    return parser.debug().parse('ignored').context.debugRecord
  }, result: {
    name: 'parser', startIndex: 0, startState:new Map([]),
    result: {ok: true, context:{index:1, _state:new Map([['a',2]])}, value: 'y'}, subRecords: [
      {name: 'x', startIndex: 0, startState:new Map([['a', 0]]),
       result: {ok: false, context:{index:0, _state:new Map([['a',1]])}, expected: new Set(['x'])}},
      {name: 'y', startIndex: 0, startState:new Map([['a', 0]]),
       result: {ok: true, context:{index:1, _state:new Map([['a',2]])}, value: 'y'}}
    ]
  }},

  {name: 'debugger: output for series', run: function(){
    var x = Parser('x', function() {
      this.set('a', 1)
      return this.ok(1, 'x')
    })
    var y = Parser('y', function() {
      this.set('a', 2)
      return this.ok(2, 'y')
    })
    var parser = Parser('parser', function() {
      this.set('a', 0)
      const xResult = this.parse(x, this)
      return this.parse(y, xResult.context)
    })
    return parser.debug().parse('ignored').context.debugRecord
  }, result: {
    name: 'parser', startIndex: 0, startState:new Map([]),
    result: {ok: true, context:{index:2, _state:new Map([['a',2]])}, value: 'y'}, subRecords: [
      {name: 'x', startIndex: 0, startState:new Map([['a', 0]]),
       result: {ok: true, context:{index:1, _state:new Map([['a',1]])}, value: 'x'}},
      {name: 'y', startIndex: 1, startState:new Map([['a', 1]]),
       result: {ok: true, context:{index:2, _state:new Map([['a',2]])}, value: 'y'}}
    ]
  }},

  {name: 'debugger: output for chain', run: function(){
    var x = Parser('x', function() {
      this.set('a', 1)
      return this.ok(1, 'x')
    }).chain(function(value) {
      this.set('a', 2)
      return Parser('y', function() {
        this.set('a', 3)
        return this.ok(2, value+'y')
      })
    }).chain(function(value) {
      this.set('a', 4)
      return Parser('z', function() {
        this.set('a', 5)
        return this.ok(3, value+'z')
      })
    })
    return x.debug().parse('ignored').context.debugRecord
  }, result: {
    name: 'chain', startIndex: 0, startState:new Map([]),
    result: {ok: true, context:{index:3, _state:new Map([['a',5]])}, value: 'xyz'}, subRecords: [
      {name: 'x', startIndex: 0, startState:new Map([]),
       result: {ok: true, context:{index:1, _state:new Map([['a',1]])}, value: 'x'}},
      {name: 'y', startIndex: 1, startState:new Map([['a',2]]),
       result: {ok: true, context:{index:2, _state:new Map([['a',3]])}, value: 'xy'}},
      {name: 'z', startIndex: 2, startState:new Map([['a',4]]),
       result: {ok: true, context:{index:3, _state:new Map([['a',5]])}, value: 'xyz'}},
    ]
  }},

  {name: 'debugger: exception', run: function(){
    var x = Parser('x', function() {
      throw new Error("Some error")
    })
    try {
      x.debug().parse('ignored')
    } catch(e) {
      return {
        errorMessage: e.toString(),
        debugRecord: e.result.context.debugRecord
      }
    }
  }, result: {
    errorMessage: "Error: Some error", debugRecord: {name: 'x', startIndex: 0, result: {ok: false, context:{index:0}, error: new Error("Some error")}}
  }},

  {name: 'debugger: chain exception', run: function(){
    var x = Parser('x', function() {
      return this.ok(1, 'x')
    }).chain((value) => {
      return Parser('y', function() {
        throw new Error("Some error")
      })
    })
      
    try {
      x.debug().parse('ignored')
    } catch(e) {
      return e.result.context.debugRecord
    }
    
  }, result: {
    name: 'chain', startIndex: 0, result: {ok: false, context:{index:1}, error: new Error("Some error")}, subRecords: [
      {name: 'x', startIndex: 0, result: {ok: true, context:{index:1}, value: 'x'}},
      {name: 'y', startIndex: 1, result: {ok: false, context:{index:1}, error: new Error("Some error")}},
    ]
  }},

  {name: 'isParser', run: function(){
    return [
      isParser(Parser('x', function(){})),
      isParser(()=>Parser('x', function(){})),
      isParser(3)
    ]
  }, result: [
    true, true, false
  ]},

  {name: 'getPossibleParser', run: function(){
    return [
      getPossibleParser(Parser('x', function(){})).name,
      getPossibleParser(()=>Parser('y', function(){})).name,
      getPossibleParser("hi").name,
      getPossibleParser(/hello/).name,
      getPossibleParser(3)
    ]
  }, result: [
    'x', 'y', '"hi"', '/hello/', 3
  ]},

  //*/
]
