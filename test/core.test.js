var {Parser} = require("../src/core")


module.exports = [
  {name: 'ok parser', run: function(){
    const results = []
    var parser = Parser(function() {
      results.push(this.index === 0)
      results.push(this.input === 'testString')
      let parseResult = this.ok(2, 'resultValue')
      results.push(parseResult.ok === true)
      results.push(parseResult.context.index === 2)
      results.push(parseResult.context.input === 'testString')
      results.push(parseResult.value === 'resultValue')
      results.push(this.index === 0)
      return parseResult
    })
    const parseResult = parser.parse('testString')

    results.push(
      parseResult.context.index === 2 &&
      parseResult.context.input === 'testString' &&
      parseResult.value === 'resultValue')
    return results
  }, result: [
    true, true, true, true, true, true, true, true,
  ]},

  {name: 'fail parser', run: function(){
    const results = []
    var parser = Parser(function() {
      results.push(this.index === 0)
      results.push(this.input === 'testString')
      let parseResult = this.fail(3, ['a', 'b', 'c'])
      results.push(parseResult.ok === false)
      results.push(parseResult.context.index === 3)
      results.push(parseResult.context.input === 'testString')
      results.push(parseResult.expected)
      results.push(this.index === 0)
      return parseResult
    })
    const parseResult = parser.parse('testString')

    results.push(
      parseResult.context.index === 3 &&
      parseResult.context.input === 'testString')
    return results
  }, result: [
    true, true, true, true, true, ['a', 'b', 'c'], true, true
  ]},

  {name: 'fail expected parameter promotes to array', run: function(){
    var parser = Parser(function() {
      return this.fail(3, 'a')
    })
    return parser.parse('testString')
  }, result: {
    expected: ['a']
  }},

  {name: 'chain', run: function(){
    const results = []
    let firstParseResult
    var parser = Parser(function() {
      firstParseResult = this.ok(4, 'a')
      return firstParseResult
    }).chain(function(value) {
      results.push(value === firstParseResult.value)
      return Parser(function() {
        results.push(this === firstParseResult.context)
        return this.ok(5, 'b')
      })
    })
    results.push(parser.parse('testString'))
    return results
  }, result: [
    true, true, {ok: true, value: 'b', context: {index: 5}}
  ]},

  // Make sure alt doesn't
  {name: 'ok parser state', run: function(){
    const results = []
    var parser = Parser(function() {
      // Note that state should only be set if the parser succeeds. On the other end, in case a parser
      // doesn't follow that rule, parsers that
      // try multiple parsers until one succeeds should pass copies of the context.
      let success = true
      if(success) {
        this.set('a', 1)
        return this.ok(2, 'resultValue')
      }
    })
    const parseResult = parser.parse('testString')

    results.push(parseResult.context.get('a') === 1)
    return results
  }, result: [
    true
  ]},

  {name: 'parser wrong input', run: function(){
    Parser('wrong')
  }, exception:
    "Argument passed to parse is neither a string nor a Context object."
  },
]

