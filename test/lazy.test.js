const {alt, eof, ser} = require("../src/parsers")
const {lazy, lazyParsers, importParsers} = require("../src/lazy")

const wrappedParserA = lazy('wrappedParserA', function() {
  return alt('b', wrappedParserB('a'))
})
const wrappedParserB = lazy('wrappedParserB', function(arg1) {
  return ser(arg1, wrappedParserA())
})

const wrappedParsers = lazyParsers({
  recursiveParserA: function() {
    return ser('a', recursiveParserB())
  },
  recursiveParserB: function() {
    return ser('b', alt(recursiveParserA(), eof()))
  }
})

const wrappedParserC = lazy("wrappedParserC", function(string) {
  if(string) {
    return string
  } else {
    this.set('x', 'a')
    return wrappedParserD()
  }
})
const wrappedParserD = lazy("wrappedParserD", function() {
  return wrappedParserC(this.get('x'))
})

eval(importParsers(wrappedParsers, 'wrappedParsers'))

module.exports = [
  {name: 'lazy', parser: wrappedParserA(), input: "ab", result: {
    ok: true, value: ['a', 'b']
  }},
  {name: 'lazy fail', parser: wrappedParserA(), input: "ac", result: {
    ok: false, expected: new Set(['b', 'a'])
  }},
  {name: 'recursive parser', parser: recursiveParserA(), input: "ababab", result: {
    ok: true, value: ["a",["b",["a",["b",["a",["b", undefined]]]]]]
  }},
  {name: 'lazy context', parser: wrappedParserC(), input: "a", result: {
    ok: true, value: "a"
  }},
]