var Nicercast = require('./')

// Stream raw audio from stdin
var input = process.stdin
var server = new Nicercast(input)

server.listen(3000, function () {
  console.log('http://localhost:3000/listen.m3u')
})

var x = 0
setInterval(function () {
  server.setMetadata('Test Metadata ' + (x++))
}, 1000)
