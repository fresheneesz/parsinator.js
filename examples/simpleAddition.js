const {
  eof, ok, fail, str, match, alt, many, ser, times, atLeast, atMost, timesBetween, not, peek
} = require("../src/parsers")
var {lazy} = require("../src/lazy")
var {displayError} = require("../src/display")

const ws = match(/ */)
const plus = str("+")
const num = match(/[0-9]/)
const side = lazy('side', function() {
  return alt(
    ser(str("("), ws, expr, ws, str(")")),
    num
  )
})
const expr = ser(side(), ws, plus, ws, side())

const simpleTest = alt(str('a'), str('b'))

// const result = expr.parse("(1+(2+3x))+4")
const result = simpleTest.parse("bb")
if(result.ok) {
  console.dir(result)
} else {
  displayError(result)
}