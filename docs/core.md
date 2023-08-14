# Core and custom parsers

## `Parser`

**`Parser(name, action)`** - Returns a `Parser` object. Useful for writing custom parsers and parser combinators. You should rarely need to create a Parser directly. 

* `name` - A display name for the parser.
* `action()` - A function called with no arguments but will receive a `Context` object as its `this`. Should evaluate the `Context` and parse appropriately, returning a `ParseResult`. See below for details on these two classes.

**`parser.parse(input)`**  - Runs the parser `action` on the relevant input and returns the `ParseResult` returned by the `action`. Note that if debugging is on (see below), it will record the exception in the `ParseResult` instead of throwing it. Also note that if you're writing a custom parser combinator, you should use `context.parse` below **instead** of running `parser.parse`, for debuggability reasons. 

**`parser.join()`**  - Convenience method to concatenate together a result that consists of a nested array of strings. 

**`parser.chain(continuation)`** - Allows access to the value returned by the parser this is called on and returns a new parser to continue parsing with. If the parser returns an ok `ParseResult`, calls `continuation` to get the next parser to continue parsing from. See [docs/chainDemo.md](../docs/chainDemo.md) for an example.

* `continuation(value)` - Should return a `Parser`. The passed `value` is the value of the previously run parser and gets the current `Context` as `this`.

**`parser.value(valueMapper)`** - Transforms the result into a new result.

* `valueMapper(value)` - A function that receives the value parsed by the calling parser and returns a new value (`ParserResult.value`) to replace the passed `value`. If the previous parser does not succeed, `value` doesn't modify the `ParseResult`. The `valueMapper` also gets the current `Context` as `this`.

**`parser.map(mapper)`** - Maps list results. Analogous to `Array.map`. Just a convenience method over `parser.value()`.

**`parser.isolate(mapper)`** - Ensures any `Context` state mutated by `parser` is not propagated outside that parser.

* `mapper(isolatedState, nextState)` - An optional function that give an opportunity to copy over select state values into the `nextState` to be propagated forward.   

**`parser.debug(shouldDebug=true)`** - Sets whether or not this `Parser` is in debug mode. The parser creates a debug record when in debug mode. See below for how debug mode affects the `ParseResult` and see `parser.parse` for how it affects parsing. 

## `ParseResult` and `Context`

A **`ParseResult` ** object is returned by a call to `parser.parse` representing the end-state of running a parser. It has the following properties:

**`parseResult.ok`** - A value of `true` indicates a successful parse, `false` an unsuccessful parse.

**`parseResult.context`** - This contains a `Context` object describing the location and state of the parser after completing the parse attempt. 

**`parseResult.value`** - This contains the value returned by the parser. It can be any kind of value. Will only be defined if the parse succeeded.

**`parseResult.expected`** - This contains a `Set` of values that the farthest failed parser expected at the point it failed. These values should ideally be of a form that fits the sentence "This parser expected _, _, or c." Will only be defined if the parse failed.

**`parseResult.error`** - This contains a caught exception if a parser threw an exception *and* the parser is in debug mode. 

**`parseResult.debugRecord`** - This is an object populated when the parser ran in debug mode. It has the following properties:

* `name` - This is the name of the parser run. At the top level of the debug record, this is the name of the top-level parser.
* `startIndex` - The 0-based index the parser started parsing from. For the top-level parser, this will be 0.
* `startState` - A copy of the `Context._state` the parser started parsing with. This is a `Map` object of all the keys set by `Context.set` eg inside your parsers (usually using `this.set`).
* `result` - The `ParserResult` the named parser returned.
* `subRecords` - An array of more `debugRecord`s of the same form, representing the subparsers called within the top-level parser.

It also has one method:

**`parseResult.copy()`** - Returns a shallow copy of the `ParseResult`. Should probably only be used for custom parsers if you know what you're doing. 

A **`Context`** represents a location in an input string, passed along state that parsers can read and write to, and in the case of debugging holds a record of the entire parsing session. Giving a parser a `Context` will cause it to parse from the `Context`'s index. It has the following properties:

**`context.input`** - The string source being parsed.

**`context.index`** - The current index the parser is at in the input.

A `Context` also has the following methods (usually called within a parser from its `this` eg `this.ok(...)`):

**`context.move(index)`** - Returns a new context where its `index` has been moved ahead.

**`context.copy()`** - Returns a copy of the context.

**`context.ok(index, value)`** - Returns a `ParseResult` that indicates that the parse succeeded through `index` with a `value` to return from the parser.

* `index` - The next index to continue parsing from.

`context.fail(index, expected)` - Returns a `ParseResult` that indicates that the parse failed at `index` and records the values `expected` at that index.

* `index` - The farthest index the parser successfully parsed through.
* `expected` - An array or `Set` of possible expected values that fits the sentence "Expected _, _, or _."

**`context.get(key)`** - Gets a state value from the context's state `Map`. `key` can be any kind of value a `Map.get` accepts.

**`context.set(key, value)`** - Sets a value on the context's state `Map`. `key` and `value` can be any kind of value `Map.set` accepts.

**`context.parse(parser, curContext)`** - Runs a sub-parser (a parser that is "part of" or a child parser of the parser this context came from). It is **pretty important** to use this method to run a sub-parser within your parser rather than using `parser.parse` directly because it properly creates debug records when the parser is in debug mode.

* `parser` - The parser to continue parsing with.
* `curContext` - The context to continue parsing from.

## Helper Functions

For convenience, parsinator.js allows your code to pass argumentless functions that return a `Parser` pretty anywhere a `Parser` is expected. It does this by simply calling the function without arguments and getting the returned `Parser`. This is useful if you want to write lazy parsers that can recurse as bare names rather than calling them, and helps if you simply forget to call them and just pass them bare. For example:

```javascript
const parsers = lazyParsers({
  integer: function() {
    return ser(/[0-9]+/).chain(value => ok(Number(value)))
  },
  version: function() {
    return series({sepBy: '.'}, integer(), integer, integer())
  },
})
```

In the above, notice that `integer()` and `integer` passed as parsers to `series` will be treated identically. The following functions are utilities used to do this internally, and can be useful externally for example in order to raise exceptions for bad input.

**`isParser(possibleParser)`** - Returns whether parsinator.js can recognize the input as a `Parser`. See `getPossibleParser` for more info.

**`getPossibleParser(possibleParser)`** - Returns a `Parser` under the following cases:

* if `possibleParser` is a `Parser`,
* if `possibleParser` is a string, it will return `str(possibleParser)`,
* if `possibleParser` is a RegExp, it will return `regex(possibleParser)`, or
* if the result of calling the passed argument as a function with no arguments is a `Parser`, it will return that.

## Writing Custom Parsers

You might write a custom parser if the available library of parsers doesn't provide the functionality you need and you can't easily or performantly create that functionality by composing parsers together. Below is the parser for a static string:

```javascript
return Parser('str('+JSON.stringify(string)+')', function() {
  const start = this.index
  const end = this.index + string.length
  if(this.input.slice(start, end) === string) {
    return this.ok(end, string)
  } else {
    return this.fail(start, [string])
  }
})
```

Notice that there are two main code paths: one that calls `this.ok` (`Context.ok`) and one that calls `this.fail`. Generally your parser can sometimes succeed and sometimes fail. 

Also note that the name passed to `Parser` is more detailed than just the name of the parser function. Adding some information based on the arguments passed to the parser function helps make more sense of information displayed when you're debugging your parser. For parser combinators (that take other parsers as arguments), its often useful to include the name of subparsers in the name of the parse, which you can get with `parser.name`.

I'll also reiterate what has already been said above: if your custom parser is a combinator that uses subparsers, its important to use `this.parse` (`Context.parse`) inside your `Parser` action instead of calling `subparser.parse` directly. This is again for setting up proper debugability. If you don't use it, your debug records probably won't end up formed correctly. 

Also, when making a custom parser, its useful to validate the parameters passed into your function as soon as possible, and throwing any exception you need to throw outside of the Parser if possible, so the exception has a better stack trace that's easier to trace to where its called from.