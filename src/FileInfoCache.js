const proto = require("proto")

// Maps a string index to line and column numbers.
module.exports = proto(function LineCache() {
  this.init = function(input) {
    this.input = input
    // A list containing the last index of each 0-based.
    this.cache = []
  }

  // Gets info about the given index as an object with the following properties:
  // * line - A 1-based line number.
  // * column - The 1-based column number.
  this.get = function(index) {
    if(index >= this.input.length) {
      throw new Error("Asking for info about an index not contained in the target string.")
    }

    let lastLineEndIndex = -1
    for(let zeroBasedLine=0; zeroBasedLine<this.cache.length; zeroBasedLine++) {
      const lineInfo = getLineInfo(index, this.cache, zeroBasedLine, lastLineEndIndex)
      if(lineInfo) {
        return lineInfo
      }
      lastLineEndIndex = this.cache[zeroBasedLine]
    }

    for(let n=lastLineEndIndex+1; n<this.input.length; n++) {
      if(this.input[n] === '\n' || n == this.input.length-1) {
        const newLineIndex = this.cache.length
        this.cache[newLineIndex] = n
        const lineInfo = getLineInfo(index, this.cache, newLineIndex, lastLineEndIndex)
        if(lineInfo) {
          return lineInfo
        }
        lastLineEndIndex = n
      }
    }

    throw new Error("Couldn't find line info.")

    // Gets line information for the passed index.
    function getLineInfo(index, cache, zeroBasedLine, lastLineEndIndex) {
      if(index < cache[zeroBasedLine]) {
        return {line: zeroBasedLine+1, column: index-lastLineEndIndex}
      } else if(index === cache[zeroBasedLine]) {
        return {line: zeroBasedLine+1, column: index-lastLineEndIndex}
      }
    }
  }
})