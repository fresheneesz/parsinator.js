const {
  ser,
  lazyParsers, importParsers,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  apple: function() {
    return ser('apple')
  },
  banana: function() {
    return ser('banana')
  },
  applebanana: function() {
    return ser(apple(), banana())
  }
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(applebanana().parse("applebanana"))) // ["apple","banana"]