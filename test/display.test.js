const {
  eof, ok, fail, str, match, alt, many, ser, times, atLeast, atMost, timesBetween, not, peek
} = require("../src/parsers")
var {lazy} = require("../src/lazy")
var {displayResult, displayDebugInfo} = require("../src/display")


module.exports = [


  //*
  {name: 'displayResult ok', run: function(){
    return [
      displayResult({ok:true, context:{input:"hi", index:1}}, {colors: false})
    ]
  }, result: [
    'Parsed successfully through line 1 column 2',
  ]},

  {name: 'displayResult fail', run: function(){
    const simpleParser = alt(str('a'), str('b'))
    const result = simpleParser.debug().parse("c")
    return [
      displayResult(result, {indicatorColor: x => x})
    ]
  }, result: [
    ' 1 | c\n' +
    '     ^\n' +
    '\n' +
    `Couldn't continue passed line 1 column 1. Expected: "a" or "b".`
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

  //*/
]

