const {
  eof, ok, fail, str, match, alt, many, ser, times, atLeast, atMost, timesBetween, not, peek
} = require("../src/parsers")
var {lazy} = require("../src/lazy")
var {displayResult, displayDebugInfo} = require("../src/display")


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
    return displayResult(result, {indicatorColor: x => x}).split('\n')
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

  //*/
]

