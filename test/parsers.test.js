const {
  eof, ok, fail, str, match, alt, many, ser, times, atLeast, atMost, timesBetween, not, peek
} = require("../src/parsers")
var {Parser} = require("../src/core")
var {lazy} = require("../src/lazy")

function a() {
  return str('a').then(function(result, state) {
    const curIndent = state.get('indent') || 0
    state.set('indent', curIndent+1)
    return ok(result)
  })
}

function x(indent, x) {
  return ser(times(str(' '), indent), str(x))
}

function lang() {
  return many(a()).chain(function(result) {
    return str(result.value[0])
  })
}

function modifyState() {
  return Parser('modifyState', function() {
    this.set('a', 'x') // The state is being set even tho this is returning a fail. This should never be done.
    return this.fail(0, 'something else')
  })
}
const parseBasedOnState = lazy('parseBasedOnState', function() {
  if(this.get('a')) {
    return str(this.get('a'))
  } else {
    return str('y')
  }
})



// console.dir(lang().parse("a b"))
// console.dir(many(str('a')).parse("aaaaa"))


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
  {name: 'fail', parser: fail(['expectedValue']), input: "nonempty", result: {
    ok: false, expected: new Set(['expectedValue'])
  }},

  // str
  {name: 'str', parser: str('a'), input: "a", result: {
    ok: true, value: "a"
  }},
  {name: 'str fail', parser: str('a'), input: "b", result: {
    ok: false, expected: new Set(["a"])
  }},

  // str
  {name: 'match', parser: match(/a+/), input: "aaaaaaa", result: {
    ok: true, value: "aaaaaaa"
  }},
  {name: 'match fail', parser: match(/a+/), input: "b", result: {
    ok: false, expected: new Set(["/a+/"])
  }},

  // ser
  {name: 'ser', parser: ser(str('a'),str('b'),str('c')), input: "abc", result: {
    ok: true, value: ['a', 'b', 'c']
  }},
  {name: 'ser map', parser: ser({a: str('a')},str('b'),{c: str('c')}), input: "abc", result: {
    ok: true, value: {a: 'a', c:'c'}
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
  // Note that this fakes a parser just to make sure the exception is caught within the test runner.
  {name: 'ser no parsers passed', parser: {parse: ()=>ser()}, input: "", exception:
    "Call to `ser` passes no parsers."
  },
  {name: 'ser map more than one label', parser: ser({a: str('a'), b: str('b')}), input: "abd", exception:
    'A ser label object contains multiple labels: {a: str("a"), b: str("b")}'
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

  // More
  // {name: 'lang', parser: lang(), input: "a b", result: {
  //   ok: true, value: ''
  // }},

  //*/
]


