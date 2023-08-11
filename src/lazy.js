// See ../docs/lazy.js for documentation.

const {Parser} = require("./core")

function lazy(name, getParser) {
  if(!(getParser instanceof Function)) {
    throw new Error("Something other than a function passed as the second argument to `lazy`.")
  }
  return function() {
    const args = arguments
    return Parser(name, function() {
      const parser = getParser.apply(this, args)
      return this.parse(parser, this)
    })
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