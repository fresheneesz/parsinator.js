const {
  ok, ser,
  lazyParsers, importParsers,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  integer: function() {
    return ser(/[0-9]+/).value(v => Number(v))
  },
  version: function() {
    return ser({major: integer()}, '.', {minor: integer()}, '.', {patch: integer()})
  },
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(version().parse("3.14.15"))) // {"major":3,"minor":14,"patch":15}
console.log()
console.log(displayResult(version().parse("3.14"))) // Couldn't continue passed line 1 column 5. Expected: ".".
