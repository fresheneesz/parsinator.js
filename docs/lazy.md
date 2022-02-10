# Lazy and importing parsers

These functions are useful for creating recursive parsers. I recommend using these for all your parsers, so that you avoid running into surprising bugs as you build your parser. See [examples/recusionDemo.js](../examples/recursionDemo.js) for an example of recursive parsers using the below functions.

**`lazy(name, parser) `**  - Turns a parser combinator into a lazy form where the function is called only when needed. This also allows accessing the current Context (including the state).

* `name` - A name for the parser (used for debug purposes).
* `parserCombinator` - A function that returns a `Parser`. Will receive the same arguments the return value of lazy is called with. Will also get a Context object as its `this`.

**`lazyParsers(parsersMap)`** - Wraps each parser function so that it can properly recurse, and ensures that each parser gets a debug name.

* `parserMap` - An object where each key is a parser name, and each value is a function to pass to `lazy`.

**`importParsers(parsersObject, parserObjectName, declarator)`** - Generates a string that declares all parsers within `parsersObject` as the names given to them in the keys in `parsersObject`. The result of this is intended to be run with `eval` in order to import all the parsers as their names in scope.

* `parserObjectName` - The name of parsersObject in the upper scope.
* `declarator` - (default: `'var'`) The type of declaration to use for the imports.

## Recommended pattern for building a set of parsers

This pattern allows you to define names in scope so they can be used on their own. Below, `parsers` is assigned an object of lazy parsers, and the call to `importParsers` that's passed to `eval` defines each named parser, so that you can access `expression`, `number`, and `array` anywhere in scope. 

```javascript
const parsers = lazyParsers({
  expression: function() {
    return alt(number, array)
  },
  number: function() {
    return regex(/[0-9]+/).result(Number)
  },
  array: function() {
    return ser(
      str('('),
      {items: listOf(str(' '), expression)},
      str(')')
    ).result(value => value.items)
  },
})
eval(importParsers(parsers, 'parsers'))
```

While the above is convenient, some people are [unfairly afraid of eval](https://humanwhocodes.com/blog/2013/06/25/eval-isnt-evil-just-misunderstood/) and some people like to use strict mode, which prevents defining variables in scope like this. For those people, the following pattern is instead recommended:

```javascript
const expression = lazy('expression', function() {
  return alt(number, array)
})
const number = lazy('number', function() {
  return regex(/[0-9]+/).result(Number)
})
const array = lazy('array', function() {
  return ser(
    str('('),
    {items: listOf(str(' '), expression)},
    str(')')
  ).result(value => value.items)
})
```

Not terrible really, just a bit of name duplication. 