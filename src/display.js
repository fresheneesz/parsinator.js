const colors = require("colors")
const FileInfoCache = require("../src/FileInfoCache")


// Displays the result
exports.displayError = function(result) {
  const info = FileInfoCache(result.context.input).get(result.context.index)
  if(result.expected.length === 1) {
    var expectedText = '"'+Array.from(result.expected)[0]+'"'
  } else if(result.expected.length === 2) {
    const expected = Array.from(result.expected)
    var expectedText = '"'+expected[0]+'" or "'+expected[1]+'"'
  } else {
    const expected = Array.from(result.expected)
    // var expectedText = Array.from(result.expected).join('", "')
    var expectedText = '"'+expected.slice(0, -1).join('", "') + '" or "'+expected[expected.length-1]+'"'
  }

  console.log("Couldn't continue passed line "+info.line+" column "+info.column+". Expected: "+expectedText+".")
}
