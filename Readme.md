# Parsinator.js

Yet another parser combinator library. This one supports state, which helps for contextful languages like ones
that have whitespace delimiting or any reasonable amount of complexity.

Docs TBD


Todo:
* Display unit tests
  * options
  * max callstack exceeded
* Inform people:
  * https://github.com/jneen/parsimmon/issues/143
  * https://github.com/jneen/parsimmon/issues/230
* parsimmon v2 discussion:
  * It should be easy to annotate all values with index ranges, for high fidelity source mapping.
* write down information about how to do naughty or.
* Write down that its important that Context.parse is used in any Parser that wants to run a sub parser, for debugability reasons.
* Note that validating parameters passed to a parser should be done outside of a Parser if possible, for better exception stack traces.

* Maybe not, consider state changes: put in detection of loops (eg if a parser doesn't advance something forward, make sure it doesn't loop forever inside a many or soemthing)
  * Actually if loops are happening, state changes are probably invalid?
