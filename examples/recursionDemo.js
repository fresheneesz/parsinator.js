const {
  str, ser, alt, regex, many, timesBetween,
  listOf,
  lazyParsers, importParsers,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  expression: function() {
    return alt(number, array)
  },
  number: function() {
    return regex(/[0-9]+/).result(Number)
  },
  array: function() {
    return ser(
      str('('),
      {items: listOf(str(' '), expression)},
      str(')')
    ).result(value => value.items)
  },
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(expression().parse("12"))) // => 12
console.log(displayResult(expression().parse("()"))) // => []
console.log(displayResult(expression().parse("(())"))) // => [[]]
console.log(displayResult(expression().parse("((1 2) (3 4))"))) // => [[1, 2], [3, 4]]
