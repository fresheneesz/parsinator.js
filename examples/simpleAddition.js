const {
  eof, ok, fail, str, match, alt, many, ser, times, atLeast, atMost, timesBetween, not, peek
} = require("../src/parsers")
var {lazy} = require("../src/lazy")
var {displayError, displayDebugInfo} = require("../src/display")

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

const result = expr.debug().parse("(1+(2+3x))+4")
// const result = simpleTest.debug().parse("bb")
if(result.ok) {
  console.dir(result)
  displayDebugInfo(result)
} else {
  displayError(result)
  console.log()
  displayDebugInfo(result)
}