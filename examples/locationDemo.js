const {
  str, alt, match, node,
  lazyParsers, importParsers,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  number: function() {
    return match(/[0-9]+/).result(Number)
  }
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(node('number', number).parse("8675309")))
// => {"name":"number","value":8675309,"start":0,"end":7}
