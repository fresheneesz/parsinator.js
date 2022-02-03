const {str, ser} = require("../src/parsers")
var {lazyParsers, importParsers} = require("../src/lazy")
var {displayResult} = require("../src/display")

const parsers = lazyParsers({
  apple: function() {
    return str('apple')
  },
  banana: function() {
    return str('banana')
  },
  applebanana: function() {
    return ser(apple(), banana())
  }
})
eval(importParsers(parsers, 'parsers'))

console.log(displayResult(applebanana().parse("applebanana"))) // ["apple","banana"]