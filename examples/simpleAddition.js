const {
  eof, ok, fail, alt, many, ser, times, atLeast, atMost, timesBetween, not, peek,
  lazy, importParsers,
  displayResult,
  memoize
} = require("../parsinator")

const ws = ser(/[ \n]*/)
const plus = ser("+")
const num = ser(/[0-9]/)
const side = lazy('side', function() {
  return alt(
    ser("(", ws, expr, ws, ")"),
    num
  )
})
const expr = ser(side(), ws, plus, ws, side())

const result = expr.debug().parse("(1+(2+3x))+4")
// const result = expr.debug().parse("(\n1+(2+3x))+4")
// const result = expr.debug().parse("(\n\n\n\n\n\n\n\n1+\n(2+\n3x))\n+4")
console.log(displayResult(result))