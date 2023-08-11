const {
  ser, alt, any,
  lazyParsers, importParsers,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  oneChar: function() {
    return any
  },
  threeChars: function() {
    return ser(oneChar(), oneChar(), oneChar())
  },
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(threeChars().parse("abc"))) // ["a","b","c"]