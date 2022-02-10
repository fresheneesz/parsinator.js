const {
  fail, str, regex, alt, ser, times,
  lazyParsers, importParsers,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  block: function() {
    return ser(indentDeclaration, indent, str('hello'))
  },
  indent: function() {
    return times(this.get('indent'), str(' '))
  },
  indentDeclaration: function() {
    return ser(str('indent='), number, str(':'), str('\n')).result(function(result) {
      this.set('indent', Number(result[1]))
      return result
    })
  },
  number: function() {
    return regex(/[0-9]/)
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
