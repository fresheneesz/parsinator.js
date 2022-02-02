const {Parser} = require("./core")

// Turns a parser combinator into a lazy form where the function is called only when needed.
// This also allows accessing the current Context (including the state).
// name - A name for the parser (used for debug purposes).
// parserCombinator - A function that returns a Parser. Will receive the same arguments the return value of lazy is called with.
//                    Will also get a Context object as its `this`.
function lazy(name, parserCombinator) {
  if(!(parserCombinator instanceof Function)) {
    throw new Error("Something other than a function passed as the second argument to `lazy`.")
  }
  return function() {
    const args = arguments
    return Parser(name, function() {
      return this.parse(parserCombinator.apply(this, args), this)
    })
  }
}

// Wraps each parser function so that it can properly recurse, and ensures that each parser gets a debug name.
// parserMap - An object where each key is a parser name, and each value is a function to pass to `lazy`.
function lazyParsers(parserMap) {
  var wrappedParsers = {}
  for(const name in parserMap) {
    wrappedParsers[name] = lazy(name, parserMap[name])
  }
  return wrappedParsers
}

// Generates a string that declares all parsers within `parsersObject` as the names given to them in the keys
// in `parsersObject`. The result of this is intended to be run with `eval` in order to import all the parsers as their
// names in scope.
// parserObjectName - The name of parsersObject in the upper scope.
// declarator - (default: 'var') The type of declaration to use for the imports.
function importParsers(parsersObject, parserObjectName, declarator) {
  if(declarator === undefined) declarator = 'var'

  var definitions = []
  for(const name in parsersObject) {
    definitions.push(name+' = '+parserObjectName+'["'+name+'"]')
  }
  return declarator+' '+definitions.join(', ')

}

module.exports = {lazy, lazyParsers, importParsers}