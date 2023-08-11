// Naughty or is a concept where cerain parts of your parser won't run until the whole rest of your language fails.
// Once the rest of the language fails, then "naughty" parsers that are more relaxed can parse additional things.
// This can be useful for finding mistakes the writer of the content your parsing made and reporting them back to the
// user of your parser in a better way, or reporting many errors and warnings rather than just a single one.

const {
  eof, fail, ok, alt, ser, many,
  listOf,
  lazyParsers, importParsers,
  displayResult, InputInfoCache
} = require("../parsinator")

const declarativeLanguage = lazyParsers({
  language: function() {
    this.set('mode', 'normal')
    return alt(declarations, naughtyLanguage).value(function(value) {
      return [value, this.get('errors')]
    })
  },
  naughtyLanguage: function() {
    this.set('mode', 'naughty')
    return declarations
  },
  declarations: function() {
    return ser(listOf(declarationSeparator, declaration, {ignoreSep: false}), eof)
  },
  declarationSeparator: function() {
    return ser(
      naughtyOr(';', ser('').chain(function(value) {
        const cache = InputInfoCache(this.input)
        const info = cache.get(this.index)
        return ok({error: ["Missing semi colon at line "+info.line+", column "+info.column+"."]})
      })),
      many('\n')
    )
  },
  declaration: function() {
    return ser(name, '=', value)
  },
  name: function() {
    return ser(/[a-z]+/)
  },
  value: function() {
    return alt(number, string)
  },
  number: function() {
    return ser(/[0-9]+/).value(Number)
  },
  string: function() {
    return ser('"', /[^"]*/, '"').value(values => values[1])
  },
  // Runs a goodParser in normal mode, but if the parser switches to failure mode, the naughtyParser
  // is attempted to be parsed as well.
  naughtyOr: function(goodParser, naughtyParser) {
    if(this.get('mode') === 'normal') {
      return goodParser
    } else {
      return alt(goodParser, naughtyParser)
    }
  },
})
eval(importParsers(declarativeLanguage, 'declarativeLanguage'))

const result = language().debug().parse(
  'a=4;\n'+
  'b="hither";\n'+
  'c=007\n'+
  'd=999;\n'
)
console.log(displayResult(result))
