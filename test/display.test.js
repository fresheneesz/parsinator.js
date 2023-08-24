var {InputInfoCache} = require("../src/core")
const {
  eof, ok, fail, many, any, alt, ser, not, timesBetween
} = require("../src/parsers")
var {lazy} = require("../src/lazy")
var {displayResult, displayDebugInfo} = require("../src/display")
const {name} = require('../src/basicParsers')


module.exports = [

  
  

  //*
  {name: 'displayResult ok', run: function(){
    return [
      displayResult({ok:true, context:{input:"hi", index:2, inputInfoCache: InputInfoCache("hi")}, value: "yes"}, {colors: false})
    ]
  }, result: [
    'Parsed successfully through line 1 column 2. Result:\n"yes"',
  ]},

  {name: 'displayResult fail', run: function(){
    const simpleParser = alt('a', 'b')
    const result = simpleParser.parse("c")
    return [
      displayResult(result, {indicatorColor: x => x})
    ]
  }, result: [
    `Couldn't continue passed line 1 column 1. Expected: "a" or "b".\n` +
    ' 1 | c\n' +
    '     ^'
  ]},

  {name: 'displayResult fail on eof', run: function(){
    const simpleParser = ser('a', 'b')
    const result = simpleParser.parse("a")
    return [
      displayResult(result, {indicatorColor: x => x})
    ]
  }, result: [
    `Couldn't continue passed line 1 column 2. Expected: "b".\n`+
    ' 1 | a\n' +
    '      ^'
  ]},

  {name: 'displayResult exception', run: function(){
    const exceptionParser = ser('a').chain(function() {
      throw new Error('hi')
    })
      
    try {
      exceptionParser.debug().parse("ab")
    } catch(e) {
      return [
        displayResult(e.result, {colors: false}).split('\n').slice(2, 6).join('\n')
      ]
    }
  }, result: [
    "Couldn't continue passed line 1 column 1. \n"+
    ' 1 | ab\n' +
    '     ^\n'+
    'In parser \'"a"\', got Error: hi'
  ]},

  {name: 'displayResult multiple lines', run: function(){
    const simpleParser = ser('a\na\naaa', 'bb\nbbbbbbbbbbbbbbbbbb\nb')
    const result = simpleParser.debug().parse("a\na\naaaxx\nxxx\nxxxxxx")
    return displayResult(result, {colors:false}).split('\n')
  }, result: [
   'ser("a\\na\\naaa", "bb\\nbbbbb...: [1:1] failed "a\\na\\naaaxx\\nxxx\\nxxxxxx"',
   ' "a\\na\\naaa": [1:1] matched "a\\na\\naaa"',
   ' "bb\\nbbbbbbbbbbbbbbbbbb\\nb": [3:4] failed "xx\\nxxx\\nxxxxxx"',
   `Couldn't continue passed line 3 column 4. Expected: "bb\\nbbbbbbbbbbbbbbbbbb\\nb".`,
   ' 1 | a',
   ' 2 | a',
   ' 3 | aaaxx',
   '        ^',
   ' 4 | xxx',
   ' 5 | xxxxxx',
  ]},

  {name: 'displayDebugInfo', run: function(){
    const simpleParser = alt('a', 'b')
    const result = simpleParser.debug().parse("bb")

    return [
      displayDebugInfo(result, {colors: false})
    ]
  }, result: [
    'alt("a", "b"): [1:1] matched "b"\n' +
    ' "a": [1:1] failed "bb"\n' +
    ' "b": [1:1] matched "b"'
  ]},

  {name: 'displayDebugInfo name', run: function(){
    const simpleParser = name("alternateName", alt('a', 'b'))
    const result = simpleParser.debug().parse("bb")

    return [
      displayDebugInfo(result, {colors: false})
    ]
  }, result: [
    'alternateName: [1:1] matched "b"\n' +
    ' "a": [1:1] failed "bb"\n' +
    ' "b": [1:1] matched "b"'
  ]},

  {name: 'displayDebugInfo lazy name', run: function(){
    const lazyParser = lazy(function() {
      return name("alternateName", alt('a', 'b'))
    })
    const result = lazyParser().debug().parse("bb")

    return [
      displayDebugInfo(result, {colors: false})
    ]
  }, result: [
    'alternateName: [1:1] matched "b"\n' +
    ' "a": [1:1] failed "bb"\n' +
    ' "b": [1:1] matched "b"'
  ]},
  
  {name: 'displayDebugInfo (line bug)', run: function(){
    const simpleParser = many(any)
    const result = simpleParser.debug().parse("\n}]")

    return [
      displayDebugInfo(result, {colors: false})
    ]
  }, result: [
    'many(any): [1:1] matched "\\n}]"\n' +
    ' any: [1:1] matched "\\n"\n' +
    ' any: [2:1] matched "}"\n' +
    ' any: [2:2] matched "]"\n' +
    ' any: [2:3] failed ""'
  ]},
  
  {name: 'displayDebugInfo isolateFromDebugRecord', run: function(){
    const simpleParser = many(ser(alt(ser('a', 'b').deisolateFromDebugRecord(), 'c')).isolateFromDebugRecord())
    const result = simpleParser.debug().parse("\n}]")

    return [
      displayDebugInfo(result, {colors: false})
    ]
  }, result: [
    'many(alt(ser("a", "b"), "c")): [1:1] matched ""\n' +
    ' ser("a", "b"): [1:1] failed "\\n}]"\n' +
    '  "a": [1:1] failed "\\n}]"' 
  ]},
  
  {name: 'displayDebugInfo isolateFromDebugRecord newline bug', run: function(){
    const simpleParser = many(ser(alt(ser('a', 'b'), 'c')).isolateFromDebugRecord())
    const result = simpleParser.debug().parse("\n}]")

    return [
      displayDebugInfo(result, {colors: false})
    ]
  }, result: [
    'many(alt(ser("a", "b"), "c")): [1:1] matched ""'
  ]},
  
  {name: 'displayDebugInfo isolateFromDebugRecord continuation bug', run: function(){
    const simpleParser = ser(alt('a', 'b').isolateFromDebugRecord(), 'c').join()
    const result = simpleParser.debug().parse("ac")

    return [
      result.value, // Also test that the value is actually returned.
      displayDebugInfo(result, {colors: false})
    ]
  }, result: [
    'ac',
    'ser(alt("a", "b"), "c"): [1:1] matched "ac"\n'+
    ' "c": [1:2] matched "c"'
  ]},

  {name: 'displayDebugInfo infinite recursion', run: function(){
    const infiniteParser = timesBetween(0, Infinity, 'x').chain(function() {
      return infiniteParser
    })

    try {
      infiniteParser.debug().parse("a")
    } catch(e) {
      const debugDisplayLines = displayDebugInfo(e.result, {colors: false}).split('\n')
      return [
        debugDisplayLines[0], debugDisplayLines[debugDisplayLines.length-1]
      ]
    }
  }, result: [
    'chain: [1:1] failed "a"',
    "Couldn't print more results, because the maxSubrecordDepth of 75 was exceeded."
  ]},

  //*/
]

