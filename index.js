var express = require('express');
var spawn = require("child_process").spawn;
var icecast = require('icecast-stack');
var lame = require('lame');
var Throttle = require('throttle');
var ip = require('ip');

var SAMPLE_SIZE = 16    // 16-bit samples, Little-Endian, Signed
  , CHANNELS = 2        // 2 channels (left and right)
  , SAMPLE_RATE = 44100 // 44,100 Hz sample rate.

// If we're getting raw PCM data as expected, calculate the number of bytes
// that need to be read for `1 Second` of audio data.
var BLOCK_ALIGN = SAMPLE_SIZE / 8 * CHANNELS // Number of 'Bytes per Sample'
  , BYTES_PER_SECOND = SAMPLE_RATE * BLOCK_ALIGN;

var Server = function(inStream, opts) { 
  var app = express();
  var serverPort = false;
  app.disable('x-powered-by');

  opts.name = opts.name || 'Nicercast';

  var throttleStream = new Throttle(BYTES_PER_SECOND);
  inStream.pipe(throttleStream);

  // stream playlist (points to other endpoint)
  app.get('/listen.m3u', function(req, res) {

    var addr = ip.address();

    res.status(200);
    res.set('Content-Type', 'audio/x-mpegurl');
    res.send('http://' + addr + ':' + serverPort + '/listen');
  });

  app.get('/listen', function(req, res, next) {

      var acceptsMetadata = req.headers['icy-metadata'] == 1;
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
      res.queueMetadata(opts.name);
    }

    // setup encodervar lame = require('lame');

    // create the Encoder instance
    var encoder = new lame.Encoder({
      channels: 2,        // 2 channels (left and right)
      bitDepth: 16,       // 16-bit samples
      sampleRate: 44100   // 44,100 Hz sample rate
    });

    encoder.on("data", function(chunk) {
      res.write(chunk);
    });

    /*
    // burst on connect data
    for (var i = 0, l = exports.bocData.length; i < l; i++) {
      encoder.stdin.write(exports.bocData[i]);
    }
    */

    var callback = function(chunk) {
      encoder.write(chunk);
    }

    throttleStream.on("data", callback);
    req.connection.on("close", function() {

      // This occurs when the HTTP client closes the connection.
      encoder.end();
      throttleStream.removeListener("data", callback);
    });
  });

  // server methods
  Server.prototype.start = function(port) {
    serverPort = port || 8001;
    app.listen(serverPort);
  }
}

module.exports = Server;
