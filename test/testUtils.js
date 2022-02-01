const util = require("util")
const colors = require("colors")
const {Parser} = require("../src/core")
const {ser} = require("../src/parsers")

// Takes in a list of tests where each test has the form:
// * name - A string name.
// * result - A javascript value to expect as the result of parsing, compared with testUtils.partialDeepEqual.
// * exception - A string exception message to expect in an exception.
// * run - A function to run that will return a value to be compared with `result`.
function runTests(tests) {
  let failures = 0
  tests.forEach(function(test) {
    try {
      let result = test.run()
      if(testResultMatches(result, test.result)) {
        logSuccess(test.name)
      } else {
        recordFailure(test.name, test.result, result)
      }
    } catch(e) {
      if(test.exception) {
        if(e.message === test.exception) {
          logSuccess(test.name)
        } else {
          recordFailure(test.name, test.exception, e.message)
        }
      } else {
        recordUnexpectedException(test, e)
      }
    }
  })

  if(failures > 0) {
      console.log(colors.red("Got "+failures+" failure"+(failures===1?'':'s')+"."))
  } else {
      console.log(colors.green("---"+successMessage()+"---"))
  }

  function logSuccess(name) {
    console.log(colors.green('./ '+name))
  }

  function recordFailure(name, expectedResult, actualResult) {
    failures++
    console.log(colors.red("X  "+name))
    console.log(colors.red(" Got unexpected result for "+JSON.stringify(name)+"!!!"))
    console.log(colors.magenta(" Expected: "+util.inspect(expectedResult, {depth:null})))
    console.log(colors.red(" Got: "))
    console.log(colors.red(" "+util.inspect(actualResult, {depth:null})))
  }

  function recordUnexpectedException(test, e) {
    failures++
    console.log(colors.red("X  "+test.name))
    console.error(" "+colors.red(e))
  }
}

// Takes in a list of tests where each test has the form:
// * name - A string name.
// * parser - A Parser to test.
// * input - String input to test the parser on.
// * index - (Default: 0) An index to start the parser at.
// * result - A javascript value to expect as the result of parsing, compared with testUtils.partialDeepEqual.
// * exception - A string exception message to expect in an exception.
function createParserTests(tests) {
  return tests.map((test)=> {
    return {
      name: test.name,
      exception: test.exception,
      result: test.result,
      run: function() {
        if(test.index !== undefined) {
          var testParser = ser(setIndex(test.index), test.parser)
        } else {
          var testParser = test.parser
        }

        return testParser.parse(test.input)
      }
    }
  })
}

function successMessage() {
    var messages = ["All green!","Light is green, trap is clean!","Yusss!"]
    var randomIndex = Math.round(Math.random()*(messages.length-1))
    return messages[randomIndex]
}

function testResultMatches(obtained, expected) {
  return partialDeepEqual(obtained, expected)
}

debugger
// Ensures the testObject has the expectedValues, but does not require all keys in testObject to have a match.
function partialDeepEqual(testObject, expectedValue) {
  if(expectedValue instanceof Array) {
    if(!(testObject instanceof Array)) return false
    if(testObject.length !== expectedValue.length) return false
    for(let n=0; n<expectedValue.length; n++) {
      if(!partialDeepEqual(testObject[n], expectedValue[n])) {
        return false
      }
    }
    return true
  } else if(expectedValue instanceof Set) {
    if(!(testObject instanceof Set)) return false
    if(testObject.length !== expectedValue.length) return false
    for(const value of expectedValue.values()) {
      if(!testObject.has(value)) {
        return false
      }
    }
    return true
  } else if(expectedValue instanceof Function) {
    return expectedValue === testObject
  }  else if(expectedValue instanceof Error) {
    return expectedValue.message === testObject.message
  } else if(expectedValue instanceof Object) {
    if(!(testObject instanceof Object)) return false
    for(let key in expectedValue){
      if(!partialDeepEqual(testObject[key], expectedValue[key])) {
        return false
      }
    }
    return true
  } else {
    return expectedValue === testObject
  }
}

// Returns a parser that consumes no input and returns a result.
function setIndex(index) {
  return Parser('setIndex', function() {
    return this.ok(index)
  })
}

module.exports = {runTests, createParserTests}