var express = require('express');
var http = require('http');
var icecast = require('icecast-stack');
var ip = require('ip');
var lame = require('lame');
var stream = new require('stream');

// 16-bit signed samples
var SAMPLE_SIZE = 16, CHANNELS = 2, SAMPLE_RATE = 44100;

// If we're getting raw PCM data as expected, calculate the number of bytes
// that need to be read for `1 Second` of audio data.
var BLOCK_ALIGN = SAMPLE_SIZE / 8 * CHANNELS, BYTES_PER_SECOND = SAMPLE_RATE * BLOCK_ALIGN;

var Server = function(inputStream, opts) {
  var app = express();
  this.app = app;
  this.serverPort = false;
  this.inputStream = inputStream;
  app.disable('x-powered-by');

  opts.name = opts.name || 'Nicercast';

  var throttleStream = stream.PassThrough();
  this._internalStream = throttleStream;
  this.inputStream.pipe(throttleStream);

  // stream playlist (points to other endpoint)
  var playlistEndpoint = function(req, res) {

    var addr = opts.ipAddress || ip.address();

    res.status(200);
    res.set('Content-Type', 'audio/x-mpegurl');
    res.send('http://' + addr + ':' + this.serverPort + '/listen');
  }.bind(this);

  app.get('/', playlistEndpoint);
  app.get('/listen.m3u', playlistEndpoint);


  // audio endpoint
  app.get('/listen', function(req, res, next) {

    var acceptsMetadata = req.headers['icy-metadata'] === 1;
    var parsed = require('url').parse(req.url, true);

    // generate response header
    var headers = {
      "Content-Type": 'audio/mpeg',
      "Connection" : 'close'
    };

    if (acceptsMetadata) {
      headers['icy-metaint'] = 8192;
    }

    res.writeHead(200, headers);

    // setup metadata transport
    if (acceptsMetadata) {
      res = new icecast.IcecastWriteStack(res, 8192);
      res.queueMetadata(this.metadata || opts.name);
    }

    // setup encoder
    var encoder = new lame.Encoder({
      channels: CHANNELS,
      bitDepth: SAMPLE_SIZE,
      sampleRate: SAMPLE_RATE
    });

    var prevMetadata = 0;
    encoder.on("data", function(chunk) {
      if (acceptsMetadata && prevMetadata != this.metadata) {
        res.queueMetadata(this.metadata || opts.name);
        prevMetadata = this.metadata;
      }

      res.write(chunk);
    }.bind(this));

    var callback = function(chunk) {
      encoder.write(chunk);
    };

    throttleStream.on("data", callback);

    req.connection.on("close", function() {
      encoder.end();
      throttleStream.removeListener("data", callback);
    });

  }.bind(this));
}

Server.prototype.start = function(port) {
  this.serverPort = port || 8001;
  this.server = http.createServer(this.app).listen(this.serverPort);
}

Server.prototype.setInputStream = function(inputStream) {
  this.inputStream.unpipe();
  this.inputStream = inputStream;
  this.inputStream.pipe(this._internalStream);
};

Server.prototype.setMetadata = function(metadata) {
  this.metadata = metadata;
};

Server.prototype.stop = function() {
  try {
    this.server.close();
  } catch (err) {

  }
}

module.exports = Server;
