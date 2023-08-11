const {
  ser, alt,
  lazyParsers, importParsers,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  a: function() {
    return ser('a')
  },
  b: function() {
    return ser('b')
  },
  c: function() {
    return ser('c')
  },
  abc: function() {
    return alt(a(), b(), c())
  },
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(abc().parse("a"))) // "a"
console.log(displayResult(abc().parse("b"))) // "b"
console.log(displayResult(abc().debug().parse("c"))) // "c"

console.log(displayResult(abc().parse("d"))) // => Couldn't continue passed line 1 column 1. Expected: "a", "b" or "c".