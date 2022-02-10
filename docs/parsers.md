# Parsers

## Basic Parsers

**`eof`** - Matches the end of input, returns undefined.

**`ok(value)`** - Returns a parser that consumes no input and returns a success `value`.

**`fail(expected)`** - Returns a parser that fails with a set of expectations.

* `expected` - A `Set` or array of expectations (these expectations should be something that fits the form "Expected _, _, or _."). 

**`str(string)`** - Matches an exact string ([example](../docs/staticStrings.md)).

**`regex(regexp)`** - Matches a regular expression.

* `regexp` - This should be a RegExp object. Only the flags `i`, `s`, `m`, and `u` are supported.

**`ser(parser, parser, ...)`** - Runs a series of parsers in sequence ([example](../docs/serDemo.md)). Each argument can either be:

* A Parser object, or
* An object with a single key-value pair, where the key is a label and the value is a Parser object to run. If any argument is a key-value pair object like that, the result will be a key-value pair object with keys matching each argument's key and each value will be the value returned by the parser. Unlabeled parsers won't have their result values included in the result value of the `ser` parse. For example, `ser({a: str('a')}, str('b'))` would have the result `{a: 'a'}` if it succeeded.

**`alt(parser, parser, ...)`** - Matches one of a series of alternate parsers ([example](../docs/altDemo.md)). Tries one after the other until it succeeds. Fails if none succeed.

**`many(parser)`** - Allows a parser to match 0 or more times in a series.

**`atLeast(numberOfTimes, parser)`** - Expects the parser to match at least `numberOfTimes` in a series.

**`atMost(numberOfTimes, parser)`** - Allows a parser to match at most `numberOfTimes` in a series.

**`times(numberOfTimes, parser)`** - Expects the parser to match `numberOfTimes` in a series.

**`timesBetween(atLeast, atMost, parser)`** - Allows a parser to match between `atLeast` and `atMost` times in a series.

**`not(parser)`** - Returns a parser that returns true if the passed in parser doesn't match. Doesn't return a value and doesn't advance the index.

**`peek(parser)`** - Returns a parser that consumes no input and fails with an expectation or whatever.

**`desc(expectedName, parser)`** - This sets a name to describe the parser for use as an `expected` value. Will override the `expected` values of the passed parser in the case it fails to `[expectedName`].

**`node(name, parser)`** - Transforms the `value` returned by the parser into `{name, value, start, end}`, where `start` is the starting index and `end` is the ending index ([example](../docs/nodeDemo.md)). Useful for error reporting, stack traces, source mapping, etc. 

**`name(name, parser)`** - Pass through parser that simply renames the parser. Mostly useful for debugging.

## More Parsers

**`listOf(separator, primaryParser, constraints)`** - A list of tokens separated by a separator. Returns the values for just the `primaryParser` matches (ignores the values of the separator matches).

* `separator` - A `Parser` used to match the separator in between `primaryParser` matches.
* `primaryParser` - The primary parser to build a list of. 
* `constraints` - An object with the following properties:
  * `atLeast` - (Default: 0) Fails if the parser doesn't match this many times.
  * `atMost` - (Default: Infinity) Limits the number of matches to this number.

**`seriesSepBy(separator, ...parsers)`** - A list of sequential tokens separated by a separator. Returns the values for just the `parsers` and ignores the separator matches.

* `separator` - A `Parser` used to match the separator in between `primaryParser` matches.
* `...parsers` - All the arguments after the first are `Parser`s that are matched in series, with the `separator` between them.

**`memoize(parserFunction, options)`** - Memoizes the passed parserFunction, meaning that it will store the results of runs of the parser for given arguments and parser state, and return the cached results when possible. If your parser has a lot of backtracking that reparses particular tokens many times, this could improve performance of your parser. This returns a value that can be used identically to the passed in `parserFunction`.

* `parserFunction` - This can either be a function that returns a `Parser`, or a bare `Parser`. 
* `options` - An object with the following optional properties:
  * `relevantStatekeys` - An array of parser state keys (`Context._state`) that are relevant to the parser. If your language has many state items, this is a way to ensure that only the state items that matter to your parser are considered, which can improve performance by reducing the number of cache misses and therefore utilizing the cache more.