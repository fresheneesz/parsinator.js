var InputInfoCache = require("../src/InputInfoCache")


module.exports = [
  {name: 'InputInfoCache', run: function(){
    const cache = InputInfoCache("hi\nho")
    return [
      cache.get(0),
      cache.get(1),
      cache.get(2),
      cache.get(3),
      cache.get(4)
    ]
  }, result: [
    {line: 1, column: 1},
    {line: 1, column: 2},
    {line: 1, column: 3},
    {line: 2, column: 1},
    {line: 2, column: 2}
  ]},

  {name: 'getLineIndex', run: function(){
    const cache = InputInfoCache("(\n\n\n\n\n\n\n\n1+\n(2+\n3x))\n+4")
    return [
      cache.getLineIndex(1),
      cache.getLineIndex(12)
    ]
  }, result: [
    0,
    21
  ]},

  {name: 'InputInfoCache - previous column number bug', run: function(){
    const cache = InputInfoCache("(1+\n(2+\n3x))\n+4")
    return [
      cache.get(9)
    ]
  }, result: [
    {line: 3, column: 2}
  ]},

  {name: 'InputInfoCache invalid index', run: function(){
    const cache = InputInfoCache("hi")
    cache.get(3)
  }, exception:
    "Asking for info about an index not contained in the target string."
  },

]

