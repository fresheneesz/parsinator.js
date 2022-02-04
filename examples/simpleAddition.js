const {
  eof, ok, fail, str, match, alt, many, ser, times, atLeast, atMost, timesBetween, not, peek,
  lazy, importParsers,
  displayResult
} = require("../parsinator")

const ws = match(/[ \n]*/)
const plus = str("+")
const num = match(/[0-9]/)
const side = lazy('side', function() {
  return alt(
    ser(str("("), ws, expr, ws, str(")")),
    num
  )
})
const expr = ser(side(), ws, plus, ws, side())

const result = expr.debug().parse("(1+(2+3))+4")
// const result = expr.debug().parse("(\n1+(2+3x))+4")
// const result = expr.debug().parse("(\n\n\n\n\n\n\n\n1+\n(2+\n3x))\n+4")
// const result = simpleTest.debug().parse("bb")
console.log(displayResult(result))