// This is a file for higher-level parsers. These parsers don't even depend directly on core, but are composed of the
// basic parsers in parsers.js.

const {ser, many, timesBetween, name} = require("./parsers")

// A list of tokens separated by a separator. Returns the values just for the primaryParser (ignores the separator).
exports.listOf = function(primaryParser, separatorParser) {
  return name(`listOf(${primaryParser}, ${separatorParser})`,
    timesBetween(0, 1,
      ser(
        primaryParser,
        many(
          ser(separatorParser,{primaryParser})
        ).map(value => value.primaryParser)
      ).result(values => [values[0]].concat(values[1]))
    ).result(values => values[0] || [])
  )
}