// See ../docs/lazy.js for documentation.

const {Parser, hideFromDebug} = require("./core")
const {name} = require('./basicParsers')

function lazy(/*[nameInput,] getParser*/) {
  if (arguments.length === 1) {
    var getParser = arguments[0]
  } else {
    var nameInput = arguments[0]
    var getParser = arguments[1]
  }
  if(!(getParser instanceof Function)) {
    throw new Error("Something other than a function passed as the `getParser` argument to `lazy`.")
  }
  
  return function() {
    const args = arguments
    return hideFromDebug(Parser(nameInput || 'lazy', function() {
      let parser = getParser.apply(this, args)
      if (nameInput !== undefined) {
        parser = name(nameInput, parser)
      }
      return this.parse(parser, this)
    }))
  }
}

function lazyParsers(parserMap) {
  var wrappedParsers = {}
  for(const name in parserMap) {
    wrappedParsers[name] = lazy(name, parserMap[name])
  }
  return wrappedParsers
}

function importParsers(parsersObject, parserObjectName, declarator) {
  if(declarator === undefined) declarator = 'var'

  var definitions = []
  for(const name in parsersObject) {
    definitions.push(name+' = '+parserObjectName+'["'+name+'"]')
  }
  return declarator+' '+definitions.join(', ')
}

module.exports = {lazy, lazyParsers, importParsers}