const {
  str, alt, regex, node,
  lazyParsers, importParsers,
  InputInfoCache,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  number: function() {
    return node('number', regex(/[0-9]+/).value(Number)).value(value => {
      const infoCache = InputInfoCache(this.input)
      value.startInfo = infoCache.get(value.start)
      value.endInfo = infoCache.get(value.end)
      return value
    })
  }
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(number().parse("8675309")))
// => {"name":"number","value":8675309,"start":0,"end":7}
