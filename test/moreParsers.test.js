const {str, ser, alt} = require("../src/parsers")
const {listOf, seriesSepBy, memoize} = require("../src/moreParsers")

const memoizedA = memoize(str('a'))
const memoizedString = memoize(function(string) {
  return str(string)
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

  // seriesSepBy
  {name: 'seriesSepBy one item', parser: seriesSepBy(str(','), str('a')), input: "a", result: {
    ok: true, value: ['a']
  }},
  {name: 'seriesSepBy three items', parser: seriesSepBy(str(','), str('a'), str('b'), str('c')), input: "a,b,c,a,a", result: {
    ok: true, value: ['a','b','c']
  }},
  {name: 'seriesSepBy fail', parser: seriesSepBy(str(','), str('a'), str('b'), str('c')), input: "a,b,d", result: {
    ok: false, expected: new Set(['c']), context:{index:4}
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

  //*/
]

