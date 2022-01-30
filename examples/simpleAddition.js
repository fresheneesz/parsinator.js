const {
  eof, ok, fail, str, match, alt, many, ser, times, atLeast, atMost, timesBetween, not, peek
} = require("../src/parsers")
var {lazy} = require("../src/lazy")
var FileInfoCache = require("../src/FileInfoCache")

const ws = match(/ */)
const plus = str("+")
const num = match(/[0-9]/)
const side = lazy(function() {
  return alt(
    ser(str("("), ws, expr, ws, str(")")),
    num
  )
})
const expr = ser(side(), ws, plus, ws, side())

const result = expr.parse("(1+(2+3x))+4")
if(!result.ok) {
  FileInfoCache(result.context.input).get()
} else {
  console.dir(result)
}