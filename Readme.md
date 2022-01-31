# Parsinator.js

Yet another parser combinator library. This one supports state, which helps for contextful languages like ones
that have whitespace delimiting or any reasonable amount of complexity.

Docs TBD


Todo:
* Error messages
* Debugging support: https://github.com/jneen/parsimmon/issues/143
  * parser names
* parsimmon v2 discussion: https://github.com/jneen/parsimmon/issues/230
  * It should be easy to annotate all values with index ranges, for high fidelity source mapping.
  * Debugging by state machine logs: log each state change. What parsers failed, which succeeded, at what steps.
* figure out how errors will work
  * I figured it out. Just have expected, let naughty or fill the need for situations like "unexpected end of line"
  * write down information about how to do naughty or.
* Write down that its important that the Context a parser receives in `this` be copied (with `copy` or `move`)
  in any combinator passing a context to a subparser.

* Maybe not, consider state changes: put in detection of loops (eg if a parser doesn't advance something forward, make sure it doesn't loop forever inside a many or soemthing)

