const {
  eof, fail, ok, str, regex, alt, ser, many,
  listOf,
  lazyParsers, importParsers,
  displayResult, InputInfoCache
} = require("../parsinator")

const declarativeLanguage = lazyParsers({
  language: function() {
    this.set('mode', 'normal')
    this.set('errors', [])
    return alt(declarations, naughtyLanguage).value(function(value) {
      return [value, this.get('errors')]
    })
  },
  naughtyLanguage: function() {
    this.set('mode', 'naughty')
    return declarations
  },
  declarations: function() {
    return ser(listOf(declarationSeparator, declaration), eof)
  },
  declarationSeparator: function() {
    return ser(
      naughtyOr(str(';'), str('').chain(function(value) {
        const cache = InputInfoCache(this.input)
        const info = cache.get(this.index)
        this.set('errors', this.get('errors').concat(["Missing semi colon at line "+info.line+", column "+info.column+"."]))
        return ok(value)
      })),
      many(str('\n'))
    )
  },
  declaration: function() {
    return ser(name, str('='), value)
  },
  name: function() {
    return regex(/[a-z]+/)
  },
  value: function() {
    return alt(number, string)
  },
  number: function() {
    return regex(/[0-9]+/).value(Number)
  },
  string: function() {
    return ser(str('"'), regex(/[^"]*/), str('"')).value(values => values[1])
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
