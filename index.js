var express = require('express');
var spawn = require("child_process").spawn;
var icecast = require('icecast-stack');
var lame = require('lame');

var SAMPLE_SIZE = 16    // 16-bit samples, Little-Endian, Signed
  , CHANNELS = 2        // 2 channels (left and right)
  , SAMPLE_RATE = 44100 // 44,100 Hz sample rate.

var Server = function(inStream, opts) { 
	var app = express();
	app.disable('x-powered-by');

	// stream playlist (points to other endpoint)
	app.get('/listen.m3u', function(req, res) {

		var ip = req.headers['x-forwarded-for'] ||
			req.connection.remoteAddress || 
	    	req.socket.remoteAddress ||
	    	req.connection.socket.remoteAddress;

		res.status(200);
		res.set('Content-Type', 'audio/x-mpegurl');
		res.send('http://' + ip + '/stream');
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
			headers['icy-name'] = 'Best';
			headers['icy-metaint'] = 8192;
		}
		res.writeHead(200, headers);


		// setup metadata transport
		if (acceptsMetadata) {
			res = new icecast.IcecastWriteStack(res, 8192);
			res.queueMetadata('the best track');
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

		inStream.on("data", callback);
		req.connection.on("close", function() {

			// This occurs when the HTTP client closes the connection.
			encoder.end();
			inStream.removeListener("data", callback);
		});
	});

	// server methods
	Server.prototype.start = function(port) {
		app.listen(port || 8001);
	}
}

module.exports = Server;
