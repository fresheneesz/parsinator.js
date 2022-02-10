# Core and custom parsers

## `Parser`

**`Parser(name, action)`** - Returns a `Parser` object. 

* `name` - A display name for the parser.
* `action()` - A function called with no arguments but will receive a `Context` object as its `this`. Should evaluate the `Context` and parse appropriately, returning a `ParseResult`. See below for details on these two classes.

**`parser.parse(input)`**  - Runs the parser `action` on the relevant input and returns the `ParseResult` returned by the `action`. Note that if debugging is on (see below), it will record the exception in the `ParseResult` instead of throwing it.

**`parser.chain(continuation)`** - Allows access to the value returned by the parser this is called on and returns a new parser to continue parsing with. If the parser returns an ok `ParseResult`, calls `continuation` to get the next parser to continue parsing from. See [docs/chainDemo.md](../docs/chainDemo.md) for an example.

* `continuation(value)` - Should return a `Parser`. The passed `value` is the value of the previously run parser and gets the current `Context` as `this`.

**`parser.result(resultMapper)`** - Transforms the result into a new result.

* `mapper(value)` - A function that receives the value parsed by the calling parser and returns a new value (`ParserResult.value`) to replace the passed `value`. If the previous parser does not succeed, `result` doesn't modify the `ParseResult`. The `mapper` also gets the current `Context` as `this`.

**`parser.map(mapper)`** - Maps list results. Analogous to `Array.map`. Just a convenience method over `parser.result()`.

**`parser.debug(shouldDebug=true)`** - Sets whether or not this `Parser` is in debug mode. The parser creates a debug record when in debug mode. See below for how debug mode affects the `ParseResult` and see `parser.parse` for how it affects parsing. 

## `ParseResult` and `Context`

A **`ParseResult` ** object is returned by a call to `parser.parse` representing the end-state of running a parser. It has the following properties:

* `parseResult.ok` - A value of `true` indicates a successful parse, `false` an unsuccessful parse.
* `parseResult.context` - This contains a `Context` object describing the location and state of the parser after completing the parse attempt. 
* `parseResult.value` - This contains the value returned by the parser. It can be any kind of value. Will only be defined if the parse succeeded.
* `parseResult.expected` - This contains a `Set` of values that the farthest failed parser expected at the point it failed. These values should ideally be of a form that fits the sentence "This parser expected _, _, or c." Will only be defined if the parse failed.
* `parseResult.error` - This contains a caught exception if a parser threw an exception *and* the parser is in debug mode. 
* `parseResult.debugRecord` - This is an object populated when the parser ran in debug mode. It has the following properties:
  * `name` - This is the name of the parser run. At the top level of the debug record, this is the name of the top-level parser.
  * `startIndex` - The 0-based index the parser started parsing from. For the top-level parser, this will be 0.
  * `startState` - A copy of the `Context._state` the parser started parsing with. This is a `Map` object of all the keys set by `Context.set` eg inside your parsers (usually using `this.set`).
  * `result` - The `ParserResult` the named parser returned.
  * `subRecords` - An array of more `debugRecord`s of the same form, representing the subparsers called within the top-level parser.

It also has one method:

**`copy`** - Returns a shallow copy of the `ParseResult`. Should probably only be used for custom parsers if you know what you're doing. 

A **`Context`** represents a location in an input string, passed along state that parsers can read and write to, and in the case of debugging holds a record of the entire parsing session. Giving a parser a `Context` will cause it to parse from the `Context`'s index.

## Helper Functions

For convenience, parsinator.js allows your code to pass argumentless functions that return a `Parser` pretty anywhere a `Parser` is expected. It does this by simply calling the function without arguments and getting the returned `Parser`. This is useful if you want to write lazy parsers that can recurse as bare names rather than calling them, and helps if you simply forget to call them and just pass them bare. For example:

```javascript
const parsers = lazyParsers({
  integer: function() {
    return regex(/[0-9]+/).chain(value => ok(Number(value)))
  },
  version: function() {
    return seriesSepBy(str('.'), integer(), integer, integer())
  },
})
```

In the above, notice that `integer()` and `integer` passed as parsers to `seriesSepBy` will be treated identically. The following functions are utilities used to do this internally, and can be useful externally for example in order to raise exceptions for bad input. 

**`isParser(possibleParser)`** - Returns whether parsinator.js can recognize the input as a `Parser`. See `getPossibleParser` for more info.

**`getPossibleParser(possibleParser)`** - Returns a `Parser` if one can be found as either:

* The passed argument, or
* the result of calling the passed argument as a function with no arguments.

