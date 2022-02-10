const {
  eof, ok, fail, str, regex, alt, many, ser, times, atLeast, atMost, timesBetween, not, peek
} = require("../src/parsers")
var {lazy} = require("../src/lazy")
var {InputInfoCache, displayResult, displayDebugInfo} = require("../src/display")


module.exports = [


  //*
  {name: 'displayResult ok', run: function(){
    return [
      displayResult({ok:true, context:{input:"hi", index:2}, value: "yes"}, {colors: false})
    ]
  }, result: [
    'Parsed successfully through line 1 column 2. Result:\n"yes"',
  ]},

  {name: 'displayResult fail', run: function(){
    const simpleParser = alt(str('a'), str('b'))
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
    const simpleParser = ser(str('a'), str('b'))
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
    const exceptionParser = str('a').chain(function() {
      throw new Error('hi')
    })
    const result = exceptionParser.debug().parse("ab")
    return [
      displayResult(result, {indicatorColor: x => x}).split('\n').slice(0, 4).join('\n')
    ]
  }, result: [
    "Couldn't continue passed line 1 column 1. \n"+
    ' 1 | ab\n' +
    '     ^\n'+
    'Got Error: hi'
  ]},

  {name: 'displayResult multiple lines', run: function(){
    const simpleParser = ser(str('a\na\naaa'), str('bb\nbbb\nb'))
    const result = simpleParser.debug().parse("a\na\naaaxx\nxxx\nxxxxxx")
    return displayResult(result, {indicatorColor: x => x, colors:false}).split('\n')
  }, result: [
   `Couldn't continue passed line 3 column 4. Expected: "bb`,
   'bbb',
   'b".',
   ' 1 | a',
   ' 2 | a',
   ' 3 | aaaxx',
   '        ^',
   ' 4 | xxx',
   ' 5 | xxxxxx',
   'ser: [1:1] failed "a\\na\\naaaxx\\nxxx\\nxxxxxx"',
   ' str("a\\na\\naaa"): [1:1] matched "a\\na\\naaa"',
   ' str("bb\\nbbb\\nb"): [3:4] failed "xx\\nxxx\\nxxxxxx"'
  ]},

  {name: 'displayDebugInfo', run: function(){
    const simpleParser = alt(str('a'), str('b'))
    const result = simpleParser.debug().parse("bb")

    return [
      displayDebugInfo(result, {colors: false})
    ]
  }, result: [
    'alt: [1:1] matched "b"\n' +
    ' str("a"): [1:1] failed "bb"\n' +
    ' str("b"): [1:1] matched "b"'
  ]},

  {name: 'displayDebugInfo infinite recursion', run: function(){
    const infiniteParser = str('').chain(function() {
      return infiniteParser
    })
    const result = infiniteParser.debug().parse("a")
    const debugDisplayLines = displayDebugInfo(result, {colors: false}).split('\n')

    return [
      debugDisplayLines[0], debugDisplayLines[debugDisplayLines.length-1]
    ]
  }, result: [
    'chain: [1:1] failed "a"',
    "Couldn't print more results, because the maxSubrecordDepth of 75 was exceeded."
  ]},

  // InputInfoCache

  {name: 'InputInfoCache', run: function(){
    const cache = InputInfoCache("hi\nho")
    return [
      cache.get(0),
      cache.get(1),
      cache.get(2),
      cache.get(3),
      cache.get(4)
    ]
  }, result: [
    {line: 1, column: 1},
    {line: 1, column: 2},
    {line: 1, column: 3},
    {line: 2, column: 1},
    {line: 2, column: 2}
  ]},

  {name: 'getLineIndex', run: function(){
    const cache = InputInfoCache("(\n\n\n\n\n\n\n\n1+\n(2+\n3x))\n+4")
    return [
      cache.getLineIndex(1),
      cache.getLineIndex(12)
    ]
  }, result: [
    0,
    21
  ]},

  {name: 'InputInfoCache - previous column number bug', run: function(){
    const cache = InputInfoCache("(1+\n(2+\n3x))\n+4")
    return [
      cache.get(9)
    ]
  }, result: [
    {line: 3, column: 2}
  ]},

  {name: 'InputInfoCache allow asking about 1 index passed the input', run: function(){
    const cache = InputInfoCache("hi")
    cache.get(2)
  }, exception:
    {line: 3, column: 3}
  },

  {name: 'InputInfoCache invalid index', run: function(){
    const cache = InputInfoCache("hi")
    cache.get(4)
  }, exception:
    "Asking for info about an index not contained in the target string: 4."
  },

  //*/
]

