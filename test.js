const {createParserTests, runTests} = require("./test/testUtils")
const coreTests = require("./test/core.test")
const parserTests = createParserTests(require("./test/parsers.test"))
const moreParsersTests = createParserTests(require("./test/moreParsers.test"))
const lazyTests = createParserTests(require("./test/lazy.test"))
const displayTests = require("./test/display.test.js")

runTests([
  ...coreTests, 
  ...parserTests, 
  ...moreParsersTests, 
  ...lazyTests, 
  ...displayTests
])
