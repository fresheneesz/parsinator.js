const {str} = require("../src/parsers")
const {listOf} = require("../src/moreParsers")

module.exports = [


  //*

  // listOf
  {name: 'listOf one item', parser: listOf(str('a'), str(',')), input: "a", result: {
    ok: true, value: ['a']
  }},
  {name: 'listOf many items', parser: listOf(str('a'), str(',')), input: "a,a,a,a,a", result: {
    ok: true, value: ['a','a','a','a','a']
  }},
  {name: 'listOf no match', parser: listOf(str('a'), str(',')), input: "b,a,a,a", result: {
    ok: true, value: [] // This parser can't really fail.
  }},

  //*/
]

