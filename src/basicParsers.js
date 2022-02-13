// These are parsers and utilities depended on by core.js. They're further documented
// in ../docs/core.md and ../docs/parsers.md
const core = require("./core")

function str(string) {
  debugger
  return core.Parser('str('+JSON.stringify(string)+')', function() {
    const start = this.index
    const end = this.index + string.length
    if(this.input.slice(start, end) === string) {
      return this.ok(end, string)
    } else {
      return this.fail(start, [string])
    }
  })
}

function regex(regexp) {
  if(regexp instanceof String) regexp = RegExp(regexp)
  for (const flag of regexp.flags) {
    // Flags ignoreCase, dotAll, multiline, and unicode are suppported.
    if (!['i','s','m','u'].includes(flag)) {
      throw new Error("only the regexp flags 'imsu' are supported")
    }
  }
  const sticky = new RegExp(regexp.source, regexp.flags + "y") // Force regex to only match at sticky.lastIndex
  return new core.Parser('regex('+regexp+')', function() {
    sticky.lastIndex = this.index
    const match = this.input.match(sticky)
    if (match) {
      const end = this.index + match[0].length
      const string = this.input.slice(this.index, end)
      return this.ok(end, string)
    }
    return this.fail(this.index, [regexp.toString()])
  })
}

function isParser(parser) {
  return parser instanceof core.Parser ||
         parser instanceof String ||
         parser instanceof RegExp ||
         parser instanceof Function && parser() instanceof core.Parser
}

function getPossibleParser(parser) {
  if(parser instanceof Function) {
    let possibleParser = parser()
    if(possibleParser instanceof core.Parser) {
      return possibleParser
    }
  } else if(typeof(parser) === 'string') {
    return str(parser)
  } else if(parser instanceof RegExp) {
    return regex(parser)
  }
  // else
  return parser
}

module.exports = {str, regex, isParser, getPossibleParser}