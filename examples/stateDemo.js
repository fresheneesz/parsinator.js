const {
  fail, alt, ser, times,
  lazyParsers, importParsers,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  block: function() {
    return ser(indentDeclaration, indent, 'hello')
  },
  indent: function() {
    return times(this.get('indent'), ' ')
  },
  indentDeclaration: function() {
    return ser('indent=', number, ':', '\n').value(function(value) {
      this.set('indent', Number(value[1]))
      return value
    })
  },
  number: function() {
    return ser(/[0-9]/)
  },
})
eval(importParsers(parsers, 'parsers'))

const result = block().debug().parse(
  "indent=4:\n"+
  "    hello"
)
console.log(displayResult(result))

const result2 = block().debug().parse(
  "indent=4:\n"+
  "   hello"
)
console.log(displayResult(result2))
