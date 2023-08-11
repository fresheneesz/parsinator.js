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
    return ser(/[0-9]+/).value(Number)
  },
  array: function() {
    return ser(
      '(',
      {items: listOf(' ', expression)},
      ')'
    ).value(value => value.items)
  },
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(expression().parse("12"))) // => 12
console.log(displayResult(expression().parse("()"))) // => []
console.log(displayResult(expression().parse("(())"))) // => [[]]
console.log(displayResult(expression().parse("((1 2) (3 4))"))) // => [[1, 2], [3, 4]]
