# Parsinator.js

Yet another parser combinator library with a couple unique features:

* State, which helps for contextful languages of any reasonable amount of complexity (like ones that have LR conflicts or whitespace delimiting).

* Powerful debug recording and displaying. This can be enormously helpful figuring out why your parser isn't working as you expect.

## Example

This example shows a set of parsers where `block` is the main one. In `block`, there is an "indentDeclaration" where the indent of the following line is defined. Then it looks for the string "hello" on the next line after the declared indent.

The indent is kept track of using parser state set with `this.set` and retrieved using `this.get`.

Also, notice that `block().debug()` is what `parse` is called on. This means a debug record will be built that will then also be displayed by the `displayResult` function.

```javascript
const parsers = lazyParsers({
  block: function() {
    return ser(indentDeclaration, indent, str('hello'))
  },
  indent: function() {
    return times(this.get('indent'), str(' '))
  },
  indentDeclaration: function() {
    return ser(str('indent='), number, str(':'), str('\n')).result(function(result) {
      this.set('indent', Number(result[1]))
      return result
    })
  },
  number: function() {
    return regex(/[0-9]/)
  },
})
eval(importParsers(parsers, 'parsers'))

const result = block().debug().parse(
  "indent=4:\n"+
  "   hello"
)
console.log(displayResult(result))
```

The output of this also shows the debugging capability:

![fail-debug](fail-debug.png)

See the full working example file at [examples/stateDemo.js](examples/stateDemo.js).

## Install

`npm install parsinator.js`

## Importing

```javascript
const {
  str, regex, alt, ser, times, // ...
  lazyParsers, importParsers, // ...
  displayResult // ...
} = require("parsinator.js")
```

## Usage

Parsinator.js parsers operate on a string and step through the string attempting to match the parser that make up your language. Some parser combinators (primarily `alt`) backtrack when a parser fails, and continues from the point where there's another alternative to try. Every parser returns a value when success and usually moves the index forward, where the next parser will start parsing from. 

Every parser returns a `ParseResult` that indicates whether it succeeded (`ok=true`) or failed (`ok=false`). A successful `ParseResult` contains the `value` returned by the parser. A failed `ParseResult` contains the input it `expected` to receive. There are more details in [docs/core.md](docs/core.md).

For convenience, any place that expects a `Parser` can also accept an argumentless function that returns a `Parser`.

```
const hello = str('hello')
const hello2 = function() { return str('hello') }

ser(hello, hello2).parse('hellohello') // Succeeds
```



The code is internally split into separate logical modules, and this documentation will use that separation as a way to compartmentalize the parts of this library. We'll start with the most useful part of the library.

### [Basic Parsers](docs/parsers.md)

Parsers: `eof`, `ok`, `fail`, `str`, `regex`, `ser`, `alt`, `many`, `atLeast`, `atMost`, `times`, `timesBetween`, `not`, `peek`, `name`, `desc`, `node`

The basic parsers are the bread and butter of this library. You'll probably use these parsers more than any other.

### [`lazy` and importing parsers](docs/lazy.md)

Parsers: `lazy`

Functions: `lazyParsers`, `importParsers`

The primary function of `lazy` is that it allows you to create recursive parsers. `lazyParsers`, `importParsers` are convenience methods that can be used to write a set of parsers and import them into scope (as seen in the example above).

### [Human readable output](docs/display.md)

Functions: `displayResult`, `displayDebugInfo`

Classes: `InputInfoCache`

`displayResult` and `displayDebugInfo` display the result of parsing in a human readable way. `InputInfoCache` is a class for transforming indexes into line and column numbers.

### [Higher-level parser combinators](docs/moreParsers.md)

Parsers: `listOf`

These are higher-level parsers that may not be needed as often as the basic parsers, but still useful enough to include in this library. 

### [Core and custom parsers](docs/core.md)

Classes: `Parser`

Functions: `isParser`, `getPossibleParser`

If the basic parsers can't do what you need to do for some reason, you can write your own low-level parser using the `Parser` class.

## [Examples](examples)

There's a number of examples that show various aspects of using parsinator.js. 

## Structure

[`core.js`](src/core.js) contains the base-level functionality everything else is built on. [`parsers.js`](src/parsers.js) contains the basic parsers built on top of that core. [`lazy.js`](src/lazy.js) contains important functionality for creating parsers that can recurse properly among other things, also built on top of `core.js`. [`moreParsers.js`](src/moreParsers.js) contains higher-level parsers built on top of the basic parsers inside `parsers.js`. [`display.js`](src/display.js) contains functionality for displaying human readable information about parse results.

All of the exports of these files are combined and exposed through the main script of the module:
[`parsinator.js`](parsinator.js).


## Todo

* Change input into an interface so streaming can be supported.
* Inform people:
  * https://github.com/jneen/parsimmon/issues/143
  * https://github.com/jneen/parsimmon/issues/230
* parsimmon v2 discussion:
  * It should be easy to annotate all values with index ranges, for high fidelity source mapping.
* write down information about how to do naughty or.
* Write down that its important that Context.parse is used in any Parser that wants to run a sub parser, for debugability reasons.
* Note that validating parameters passed to a parser should be done outside of a Parser if possible, for better exception stack traces.
