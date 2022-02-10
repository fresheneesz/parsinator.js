const {
  str, alt, regex, node,
  lazyParsers, importParsers,
  InputInfoCache,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  number: function() {
    return node('number', regex(/[0-9]+/).result(Number)).result(result => {
      const infoCache = InputInfoCache(this.input)
      result.startInfo = infoCache.get(result.start)
      result.endInfo = infoCache.get(result.end)
      return result
    })
  }
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(number().parse("8675309")))
// => {"name":"number","value":8675309,"start":0,"end":7}
