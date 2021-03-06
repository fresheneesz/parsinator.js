const {str, regex} = require("../src/basicParsers")
const {
  eof, ok, fail, alt, many, ser, times, atLeast, atMost, timesBetween, not, peek, name, desc, node
} = require("../src/parsers")
var {lazy} = require("../src/lazy")

const modifyState = lazy('modifyState', function() {
  this.set('a', 'x') // The state is being set even tho this is returning a fail. This should never be done.
  return fail(0, 'something else')
})
const parseBasedOnState = lazy('parseBasedOnState', function() {
  if(this.get('a')) {
    return str(this.get('a'))
  } else {
    return str('y')
  }
})

const x = lazy('x', function() {
  return str('x').chain(function(value) {
    this.set('state', 3)
    return ok(value)
  })
})

module.exports = [


  //*

  // eof
  {name: 'eof empty string', parser: eof(), input: "", result: {
    ok: true, value: undefined
  }},
  {name: 'eof empty string overindex', parser: eof(), input: "", index: 999, result: {
    ok: true
  }},
  {name: 'eof nonempty string', parser: eof(), input: "nonempty", index: 8, result: {
    ok: true
  }},
  {name: 'eof failure', parser: eof(), input: "nonempty", result: {
    ok: false, expected: new Set(["EOF"])
  }},

  // ok
  {name: 'ok', parser: ok('value'), input: "nonempty", result: {
    ok: true, value: "value"
  }},

  // fail
  {name: 'fail', parser: fail(new Set(['expectedValue'])), input: "nonempty", result: {
    ok: false, expected: new Set(['expectedValue'])
  }},
  {name: 'fail array', parser: fail(['expectedValue']), input: "nonempty", result: {
    ok: false, expected: new Set(['expectedValue'])
  }},
  {name: 'fail single value', parser: fail('expectedValue'), input: "nonempty", result: {
    ok: false, expected: new Set(['expectedValue'])
  }},

  // str
  {name: 'str', parser: str('a'), input: "a", result: {
    ok: true, value: "a"
  }},
  {name: 'str fail', parser: str('a'), input: "b", result: {
    ok: false, expected: new Set(["a"])
  }},

  // regex
  {name: 'regex', parser: regex(/a+/), input: "aaaaaaa", result: {
    ok: true, value: "aaaaaaa"
  }},
  {name: 'regex fail', parser: regex(/a+/), input: "b", result: {
    ok: false, expected: new Set(["/a+/"])
  }},

  // ser
  {name: 'ser', parser: ser(str('a'),str('b'),str('c')), input: "abc", result: {
    ok: true, value: ['a', 'b', 'c']
  }},
  // The undefined: undefined there is testing to cover a bug where an undefined label was used as a key.
  {name: 'ser map', parser: ser({a: str('a')},str('b'),{c: str('c')}), input: "abc", result: {
    ok: true, value: {a: 'a', undefined: undefined, c:'c'}
  }},
  {name: 'ser fail start', parser: ser(str('a'),str('b'),str('c')), input: "bbd", result: {
    ok: false, expected: new Set(["a"])
  }},
  {name: 'ser fail repeat', parser: ser(str('a'),str('b'),str('c')), input: "aaa", result: {
    ok: false, expected: new Set(["b"])
  }},
  {name: 'ser fail end', parser: ser(str('a'),str('b'),str('c')), input: "abd", result: {
    ok: false, expected: new Set(["c"])
  }},
  {name: 'ser retains state', parser: ser(x,str('y')), input: "xy", result: {
    ok: true, context:{index:2, _state: new Map([['state', 3]])}
  }},
  // Note that this fakes a parser just to make sure the exception is caught within the test runner.
  {name: 'ser no parsers passed', parser: {parse: ()=>ser()}, input: "", exception:
    "Call to `ser` passes no parsers."
  },
  {name: 'ser map more than one label',
   parser: lazy('lazy', () =>
     ser({a: str('a'), b: str('b')})
   )(),
   input: "abd",
   exception: 'A ser label object contains multiple labels: {a: str("a"), b: str("b")}.'
  },

  // alt
  {name: 'alt first', parser: ser(alt(str('a'), str('b')), alt(str('a'), str('b'))), input: "ab", result: {
    ok: true, value: ['a', 'b'], context: {index: 2}
  }},
  {name: 'alt second', parser: ser(alt(str('a'), str('b')), alt(str('a'), str('b'))), input: "ab", result: {
    ok: true, value: ['a', 'b'], context: {index: 2}
  }},
  {name: 'alt fail', parser: alt(str('a'), str('b')), input: "cab", result: {
    ok: false, expected: new Set(['a','b']), context: {index: 0}
  }},
  {name: 'alt doesnt allow state pollution', parser: alt(modifyState(), parseBasedOnState()), input: "y", result: {
    ok: true, value: 'y'
  }},

  // times
  {name: 'times', parser: times(2, str('a')), input: "aa", result: {
    ok: true, value: ['a', 'a']
  }},
  {name: 'times no match', parser: times(2, str('a')), input: "ab", result: {
    ok: false, expected: new Set(['a'])
  }},

  // atLeast
  {name: 'atLeast', parser: atLeast(2, str('a')), input: "aa", result: {
    ok: true, value: ['a', 'a']
  }},
  {name: 'atLeast more', parser: atLeast(2, str('a')), input: "aaaa", result: {
    ok: true, value: ['a', 'a', 'a', 'a']
  }},
  {name: 'atLeast less', parser: atLeast(2, str('a')), input: "a", result: {
    ok: false, expected: new Set(['a'])
  }},

  // atMost
  {name: 'atMost', parser: atMost(2, str('a')), input: "aa", result: {
    ok: true, value: ['a', 'a']
  }},
  {name: 'atMost more', parser: atMost(2, str('a')), input: "aaaa", result: {
    ok: true, value: ['a', 'a']
  }},
  {name: 'atMost less', parser: atMost(2, str('a')), input: "a", result: {
    ok: true, value: ['a']
  }},

  // timesBetween
  {name: 'timesBetween', parser: timesBetween(2, 4, str('a')), input: "aa", result: {
    ok: true, value: ['a', 'a']
  }},
  {name: 'timesBetween more', parser: timesBetween(2, 4, str('a')), input: "aaaaa", result: {
    ok: true, value: ['a', 'a', 'a', 'a']
  }},
  {name: 'timesBetween less', parser: atLeast(2, str('a')), input: "a", result: {
    ok: false, expected: new Set(['a'])
  }},

  // many
  {name: 'many', parser: many(str('a')), input: "aaaaab", result: {
    ok: true, value: ['a', 'a', 'a', 'a', 'a']
  }},
  {name: 'many no matches', parser: many(str('a')), input: "bbb", result: {
    ok: true, value: []
  }},
  {name: 'many retains state', parser: many(x), input: "xx", result: {
    ok: true, context:{index:2, _state: new Map([['state', 3]])}
  }},

  // not
  {name: 'not', parser: not(str('a')), input: "b", result: {
    ok: true, value: undefined, context:{index:0}
  }},
  {name: 'not fail', parser: not(str('a')), input: "a", result: {
    ok: false, expected: new Set(['not a']), context:{index:0}
  }},

  // peek
  {name: 'peek', parser: peek(str('a')), input: "a", result: {
    ok: true, value: 'a', context:{index:0}
  }},
  {name: 'peek fail', parser: peek(str('a')), input: "b", result: {
    ok: false, expected: new Set(['a']), context:{index:0}
  }},

  // name
  {name: 'name', parser: name('x', str('a')), input: "a", result: {
    ok: true, value: 'a', context:{index:1}
  }},
  {name: 'name fail', parser: name('jaweij', str('a')).debug(), input: "b", result: {
    ok: false, expected: new Set(['a']), context:{index:0, debugRecord: {name: 'jaweij'}}
  }},

  // desc
  {name: 'desc', parser: desc('x', str('a')), input: "a", result: {
    ok: true, value: 'a', context:{index:1}
  }},
  {name: 'desc fail', parser: desc('the first letter of the alphabet', str('a')), input: "b", result: {
    ok: false, expected: new Set(['the first letter of the alphabet']), context:{index:0}
  }},

  // node
  {name: 'node', parser: node('nodeName', str('a')), input: "a", result: {
    ok: true, value: {name: 'nodeName', value: 'a', start: 0, end: 1}, context:{index:1}
  }},
  {name: 'node fail', parser: node('nodeName', str('a')), input: "b", result: {
    ok: false, expected: new Set(['a']), context:{index:0}
  }},

  //*/
]

