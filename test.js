/* eslint-env mocha */

var fs = require('fs')
var icy = require('icy')
var url = require('url')
var http = require('http')
var lame = require('lame')
var assert = require('assert')
var baudio = require('baudio')
var concat = require('concat-stream')

var Nicercast = require('./')

describe('Nicercast', function () {
  var server, remote

  before(function (done) {
    var input = baudio(function (t) {
      return Math.sin(2 * Math.PI * t * 441)
    })

    server = new Nicercast(input, { metadata: 'Initial metadata' })

    server.listen(0, function () {
      var info = server.address()

      remote = url.format({
        protocol: 'http',
        hostname: info.address,
        port: info.port,
        pathname: '/'
      })

      done()
    })
  })

  after(function (done) {
    server.close(done)
  })

  it('/listen.m3u', function (done) {
    http.get(remote + 'listen.m3u', function (res) {
      res.pipe(concat(function (body) {
        assert.equal(body.toString(), remote + 'listen')
        done()
      }))
    })
  })

  it('/listen', function (done) {
    this.timeout(10000) // 10 Seconds

    var req = icy.get(remote + 'listen', function (res) {
      var decoder = new lame.Decoder()
      var devnull = fs.createWriteStream('/dev/null')

      var format = null
      var metadatas = []

      res.on('metadata', function (metadata) {
        metadatas.push(icy.parse(metadata).StreamTitle)

        if (metadatas.length === 1) {
          server.setMetadata('Updated metadata')
        }

        if (metadatas.length === 2) {
          req.abort()
        }
      })

      decoder.on('format', function (_format) {
        format = _format
      })

      res.pipe(decoder).pipe(devnull)

      res.on('end', function () {
        assert.ok(format)
        assert.deepEqual(metadatas, ['Initial metadata', 'Updated metadata'])
        done()
      })
    })
  })
})
