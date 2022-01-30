var FileInfoCache = require("../src/FileInfoCache")


module.exports = [
  {name: 'FileInfoCache', run: function(){
    const cache = FileInfoCache("hi\nho")
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

  {name: 'FileInfoCache invalid index', run: function(){
    const cache = FileInfoCache("hi")
    cache.get(3)
  }, exception:
    "Asking for info about an index not contained in the target string."
  },

]

