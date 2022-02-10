const {
  fail, str, regex, desc,
  lazyParsers, importParsers,
  displayResult
} = require("../parsinator")

const parsers = lazyParsers({
  lowerAlphaChar: function() {
    return desc('lower case letter', regex(/[a-z]/))
  },
  lowerUpperAlphaPair: function() {
    return lowerAlphaChar().chain(function(value) {
      if(value === 'c') {
        return fail('No! We get C sick')
      }
      return desc('upper case letter', str(value.toUpperCase()))
    })
  }
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(lowerUpperAlphaPair().parse("aA"))) // ["a", "A"]
console.log(displayResult(lowerUpperAlphaPair().parse("bB"))) // ["b", "B"]
console.log(displayResult(lowerUpperAlphaPair().parse("bb"))) // Expected: "upper case letter".
console.log(displayResult(lowerUpperAlphaPair().parse("Aa"))) // Expected: "lower case letter".
console.log(displayResult(lowerUpperAlphaPair().parse("cC"))) // ["b", "B"]
