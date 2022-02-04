const {
  str, ser, alt, match, many, timesBetween,
  lazyParsers, importParsers,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  expression: function() {
    return alt(number, array)
  },
  number: function() {
    return match(/[0-9]+/).result(Number)
  },
  array: function() {
    return ser(
      str('('),
      {items: listOf(expression, str(' '))},
      str(')')
    ).result(value => value.items)
  },
  // A list of tokens separated by a separator. Returns the values just for the primaryParser (ignores the separator).
  listOf: function(primaryParser, separatorParser) {
    return timesBetween(0, 1,
      ser(
        primaryParser,
        many(
          ser(separatorParser,{primaryParser})
        ).map(value => value.primaryParser)
      ).result(values => [values[0]].concat(values[1]))
    ).result(values => values[0] || [])
  }
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(expression().parse("12"))) // => 12
console.log(displayResult(expression().parse("()"))) // => []
console.log(displayResult(expression().parse("(())"))) // => [[]]
console.log(displayResult(expression().parse("((1 2) (3 4))"))) // => [[1, 2], [3, 4]]


// Takes a nested array and flattens it into a single-depth (non nested) array.
function flatten(nestedArray) {
  let result = []
  nestedArray.forEach(value => {
    if(value instanceof Array) {
      result = result.concat(flatten(value))
    } else {
      result.push(value)
    }
  })
  return result
}