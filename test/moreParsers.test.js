const {str} = require("../src/basicParsers")
const {ok, ser, alt} = require("../src/parsers")
const {listOf, series, memoize, isolate} = require("../src/moreParsers")

const memoizedA = memoize(str('a'))
const memoizedString = memoize(function(string) {
  return str(string)
})

const wrapper = function(x) {
  return ser('(', x, ')')
}

const initState = str('a').value(function(value) {
  this.set('a', 'no')
  return value
})
const modifyState = str('b').value(function(value) {
  this.set('a', 'yes')
  return value
})
const readState = str('c').value(function(value) {
  return value += this.get('a')
})

module.exports = [

  //*

  // listOf
  {name: 'listOf one item', parser: listOf(str(','), str('a')), input: "a", result: {
    ok: true, value: ['a']
  }},
  {name: 'listOf many items', parser: listOf(str(','), str('a')), input: "a,a,a,a,a", result: {
    ok: true, value: ['a','a','a','a','a']
  }},
  {name: 'listOf no match', parser: listOf(str(','), str('a')), input: "b,a,a,a", result: {
    ok: true, value: [] // This parser can't really fail.
  }},
  {name: 'listOf too few', parser: listOf({atLeast:3}, str(','), str('a')), input: "a,a", result: {
    ok: false, expected: new Set([','])
  }},
  {name: 'listOf more than max', parser: listOf({atMost:2}, str(','), str('a')), input: "a,a,a", result: {
    ok: true, value: ['a','a']
  }},
  {name: 'listOf ignoreSep', parser: listOf({ignoreSep: false}, str(','), str('a')), input: "a,a", result: {
    ok: true, value: ['a', ',', 'a']
  }},

  // series
  {name: 'series one item', parser: series({sepBy: ','}, str('a')), input: "a", result: {
    ok: true, value: ['a']
  }},
  {name: 'series three items', parser: series({sepBy: ','}, str('a'), str('b'), str('c')), input: "a,b,c,a,a", result: {
    ok: true, value: ['a','b','c']
  }},
  {name: 'series fail', parser: series({sepBy: ','}, str('a'), str('b'), str('c')), input: "a,b,d", result: {
    ok: false, expected: new Set(['c']), context:{index:4}
  }},
  {name: 'series ignoreSep', parser: series({sepBy: ',', ignoreSep: false}, str('a'), str('b')), input: "a,b", result: {
    ok: true, value: ['a', ',', 'b']
  }},
  {name: 'series wrap', parser: series({wrap: wrapper}, str('a'), str('b')), input: "(a)(b)", result: {
    ok: true, value: ['(', 'a', ')', '(', 'b', ')']
  }},

  // memoize - the same parser run at the same index in the same conditions will return a remembered result.
  {name: 'memoize', parser: alt(ser(memoizedA, str('b')), ser(memoizedA, str('c'))), input: "ac", result: {
    ok: true, value: ['a', 'c']
  }},
  {name: 'memoize fail', parser: alt(ser(memoizedA, str('b')), ser(memoizedA, str('c'))), input: "ad", result: {
    ok: false, expected: new Set(['b', 'c']), context:{index:1}
  }},
  {name: 'memoize function', parser: alt(ser(memoizedString('a'), str('b')), ser(memoizedString('a'), str('c'))), input: "ac", result: {
    ok: true, value: ['a', 'c']
  }},

  // isolate
  {name: 'isolate', parser: ser(initState, isolate(modifyState), readState), input: "abc", result: {
    ok: true, value: ['a','b','cno']
  }},

  //*/
]
