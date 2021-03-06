const {
  ser, alt, regex,
  lazyParsers, importParsers,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  oneChar: function() {
    return regex(/./ms)
  },
  threeChars: function() {
    return ser(oneChar(), oneChar(), oneChar())
  },
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(threeChars().parse("abc"))) // ["a","b","c"]