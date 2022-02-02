const {ok, str, ser, match} = require("../src/parsers")
var {lazyParsers, importParsers} = require("../src/lazy")
var {displayResult} = require("../src/display")

const parsers = lazyParsers({
  integer: function() {
    return match(/[0-9]+/).chain(value => ok(Number(value)))
  },
  version: function() {
    return ser({major: integer()}, str('.'), {minor: integer()}, str('.'), {patch: integer()})
  },
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(version().parse("3.14.15")))
console.log()
    debugger
console.log(displayResult(version().parse("3.14")))
