const {ok, ser, alt} = require("../src/parsers")
const {listOf, series, memoize, isolate} = require("../src/moreParsers")

const memoizedA = memoize('a')
const memoizedString = memoize(function(string) {
  return string
})

const wrapper = function(x) {
  return ser('(', x, ')')
}

module.exports = [

  //*

  // listOf
  {name: 'listOf one item', parser: listOf(',', 'a'), input: "a", result: {
    ok: true, value: ['a']
  }},
  {name: 'listOf many items', parser: listOf(',', 'a'), input: "a,a,a,a,a", result: {
    ok: true, value: ['a','a','a','a','a']
  }},
  {name: 'listOf no match', parser: listOf(',', 'a'), input: "b,a,a,a", result: {
    ok: true, value: [] // This parser can't really fail.
  }},
  {name: 'listOf too few', parser: listOf({atLeast:3}, ',', 'a'), input: "a,a", result: {
    ok: false, expected: new Set([','])
  }},
  {name: 'listOf more than max', parser: listOf({atMost:2}, ',','a'), input: "a,a,a", result: {
    ok: true, value: ['a','a']
  }},
  {name: 'listOf ignoreSep', parser: listOf({ignoreSep: false}, ',', 'a'), input: "a,a", result: {
    ok: true, value: ['a', ',', 'a']
  }},

  // series
  {name: 'series one item', parser: series({sepBy: ','}, 'a'), input: "a", result: {
    ok: true, value: ['a']
  }},
  {name: 'series three items', parser: series({sepBy: ','}, 'a', 'b', 'c'), input: "a,b,c,a,a", result: {
    ok: true, value: ['a','b','c']
  }},
  {name: 'series fail', parser: series({sepBy: ','}, 'a', 'b', 'c'), input: "a,b,d", result: {
    ok: false, expected: new Set(['c']), context:{index:4}
  }},
  {name: 'series ignoreSep', parser: series({sepBy: ',', ignoreSep: false}, 'a', 'b'), input: "a,b", result: {
    ok: true, value: ['a', ',', 'b']
  }},
  {name: 'series wrap', parser: series({wrap: wrapper}, 'a', 'b'), input: "(a)(b)", result: {
    ok: true, value: ['(', 'a', ')', '(', 'b', ')']
  }},

  // memoize - the same parser run at the same index in the same conditions will return a remembered result.
  {name: 'memoize', parser: alt(ser(memoizedA, 'b'), ser(memoizedA, 'c')), input: "ac", result: {
    ok: true, value: ['a', 'c']
  }},
  {name: 'memoize fail', parser: alt(ser(memoizedA, 'b'), ser(memoizedA, 'c')), input: "ad", result: {
    ok: false, expected: new Set(['b', 'c']), context:{index:1}
  }},
  {name: 'memoize function', parser: alt(ser(memoizedString('a'), 'b'), ser(memoizedString('a'), 'c')), input: "ac", result: {
    ok: true, value: ['a', 'c']
  }},

  //*/
]
