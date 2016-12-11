var icy = require('icy')
var url = require('url')
var http = require('http')
var lame = require('lame')
var util = require('util')

var CHANNELS = 2
var SAMPLE_SIZE = 16
var SAMPLE_RATE = 44100
var META_INTERVAL = 8192

function removeValueFromArray (array, value) {
  var index = array.indexOf(value)
  if (index >= 0) array.splice(index, 1)
}

function Nicercast (inputStream, opts) {
  opts = opts || {}

  this._server = http.createServer(this._handleRequest.bind(this))
  this._inputStream = inputStream
  this._metadata = opts.metadata || 'Nicercast'

  this._listenStreams = []
  this._metadataStreams = []
}

Nicercast.prototype._handleRequest = function (req, res) {
  switch (req.url) {
    case '/':
    case '/listen.m3u':
      if (req.method === 'GET') {
        this._playlist(req, res)
      } else {
        res.writeHead(405)
        res.end('Method not allowed')
      }

      break
    case '/listen':
      if (req.method === 'GET') {
        this._listen(req, res)
      } else {
        res.writeHead(405)
        res.end('Method not allowed')
      }

      break
    default:
      res.writeHead(404)
      res.end('Not found')
  }
}

Nicercast.prototype._playlist = function (req, res) {
  var urlProps = {
    protocol: 'http',
    pathname: '/listen'
  }

  if (req.headers.host) {
    urlProps.host = req.headers.host
  } else {
    var info = req.socket.address()
    urlProps.hostname = info.address
    urlProps.port = info.port
  }

  res.writeHead(200, { 'Content-Type': 'audio/x-mpegurl' })
  res.end(url.format(urlProps))
}

Nicercast.prototype._listen = function (req, res) {
  var acceptsMetadata = (req.headers['icy-metadata'] === '1')

  res.writeHead(200, {
    'Connection': 'close',
    'Content-Type': 'audio/mpeg',
    'Icy-Metaint': (acceptsMetadata ? META_INTERVAL : undefined)
  })

  var output
  if (acceptsMetadata) {
    output = new icy.Writer(META_INTERVAL)
    this._metadataStreams.push(output)
    output.queueMetadata(this._metadata)
    output.pipe(res)
  } else {
    output = res
  }

  var encoder = new lame.Encoder({
    channels: CHANNELS,
    bitDepth: SAMPLE_SIZE,
    sampleRate: SAMPLE_RATE
  })

  this._listenStreams.push(encoder)

  function teardown () {
    removeValueFromArray(this._listenStreams, encoder)
    removeValueFromArray(this._metadataStreams, output)

    this._inputStream.unpipe(encoder)
    encoder.unpipe(output)
    encoder.end()
  }

  this._inputStream.pipe(encoder).pipe(output)
  req.socket.on('close', teardown.bind(this))
}

Nicercast.prototype.setMetadata = function (metadata) {
  this._metadata = metadata

  this._metadataStreams.forEach(function (stream) {
    stream.queue(metadata)
  })
}

Nicercast.prototype.setInputStream = function (inputStream) {
  var currentInput = this._inputStream

  this._listenStreams.forEach(function (stream) {
    currentInput.unpipe(stream)
    inputStream.pipe(stream)
  })

  this._inputStream = inputStream
}

Nicercast.prototype.listen = function (port, hostname, backlog, callback) {
  this._server.listen.apply(this._server, arguments)
}

Nicercast.prototype.close = function (callback) {
  this._server.close.apply(this._server, arguments)
}

Nicercast.prototype.address = function () {
  return this._server.address()
}

function start (port, callback) {
  var self = this

  this.listen(port || 0, function () {
    callback(self.address().port)
  })
}

function stop () {
  try { this.close() } catch (err) {}
}

Nicercast.prototype.start = util.deprecate(start, '.start(port[, cb]) is deprecated, use .listen(port[, hostname][, backlog][, cb])')
Nicercast.prototype.stop = util.deprecate(stop, '.stop() is deprecated, use .close([cb])')

module.exports = Nicercast
