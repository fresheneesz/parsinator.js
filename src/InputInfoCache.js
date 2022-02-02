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
    if(index < 0 || this.input.length <= index) {
      throw new Error("Asking for info about an index not contained in the target string: "+index+'.')
    }

    let lastLineEndIndex = -1
    for(let zeroBasedLine=0; zeroBasedLine<this.cache.length; zeroBasedLine++) {
      const lineInfo = getLineInfo(index, this.cache, zeroBasedLine, lastLineEndIndex)
      if(lineInfo) {
        return lineInfo
      }
      lastLineEndIndex = this.cache[zeroBasedLine]
    }

    const lineInfo = this.searchUntil((zeroBasedLineNumber, lastLineEndIndex) => {
      return getLineInfo(index, this.cache, zeroBasedLineNumber, lastLineEndIndex)
    })
    if(lineInfo) {
      return lineInfo
    } else {
      throw new Error("Couldn't find line info.")
    }

    // Gets line information for the passed index.
    function getLineInfo(index, cache, zeroBasedLine, lastLineEndIndex) {
      if(index < cache[zeroBasedLine]) {
        return {line: zeroBasedLine+1, column: index-lastLineEndIndex}
      } else if(index === cache[zeroBasedLine]) {
        return {line: zeroBasedLine+1, column: index-lastLineEndIndex}
      }
    }
  }

  // Searches the input until check returns something truthy.
  // startIndex - The line to start searching from.
  // check(lineNumber, lastLineEndIndex)
  this.searchUntil = function(check) {
    let lastLineEndIndex = this.cache[this.cache.length-1] || -1
    const startIndex = lastLineEndIndex+1
    for(let n=startIndex; n<this.input.length; n++) {
      if(this.input[n] === '\n' || n == this.input.length-1) {
        this.cache.push(n)
        const checkResult = check(this.cache.length-1, lastLineEndIndex)
        if(checkResult) {
          return checkResult
        }
        lastLineEndIndex = n
      }
    }
  }

  // Returns the index at which the passed 1-based line number starts.
  this.getLineIndex = function(line) {
    if(line === 1) return 0
    line = line-1 // 0 based is easier internally.
    if(this.cache.length < line) {
      this.searchUntil((lineNumber) => {
        return lineNumber === line
      })
    }
    if(line <= this.cache.length) {
      // The end of the previous line plus 1.
      return this.cache[line-1]+1
    }
  }
})