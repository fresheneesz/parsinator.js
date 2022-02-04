const {
  ok, ser, str, match,
  lazyParsers, importParsers,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  integer: function() {
    return match(/[0-9]+/).chain(value => ok(Number(value)))
  },
  version: function() {
    return ser({major: integer()}, str('.'), {minor: integer()}, str('.'), {patch: integer()})
  },
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(version().parse("3.14.15"))) // {"major":3,"minor":14,"patch":15}
console.log()
console.log(displayResult(version().parse("3.14"))) // Couldn't continue passed line 1 column 5. Expected: ".".
