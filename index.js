var express = require('express');
var spawn = require("child_process").spawn;
var icecast = require('icecast-stack');

var SAMPLE_SIZE = 16    // 16-bit samples, Little-Endian, Signed
  , CHANNELS = 2        // 2 channels (left and right)
  , SAMPLE_RATE = 44100 // 44,100 Hz sample rate.

var Server = function(inStream, opts) { 
	var app = express();
	app.disable('x-powered-by');

	app.get('/stream.m3u', function(req, res) {
		var ip = req.headers['x-forwarded-for'] ||
			req.connection.remoteAddress || 
	    	req.socket.remoteAddress ||
	    	req.connection.socket.remoteAddress;

		res.status(200);
		res.set('Content-Type', 'audio/x-mpegurl');
		res.send('http://' + ip + '/stream');
	});

	app.get('/stream', function(req, res, next) {

	    var acceptsMetadata = req.headers['icy-metadata'] == 1;
	    var parsed = require('url').parse(req.url, true);

	    // generate response header
		var headers = {
			"Content-Type": contentType,
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

		// setup encoder
		var encoder = spawn('lame', [
	   		"-S" // Operate silently (nothing to stderr)
	  		, "-r" // Input is raw PCM
	  		, "-V 9"
	  		, "-s", SAMPLE_RATE / 1000 // Input sampling rate: 44,100
	  		, "-"// Input from stdin
	  		, "-" // Output to stderr
		]);

		encoder.stdout.on("data", function(chunk) {
			res.write(chunk);
		});

		/*
		// burst on connect data
		for (var i = 0, l = exports.bocData.length; i < l; i++) {
			encoder.stdin.write(exports.bocData[i]);
		}
		*/

		var callback = function(chunk) {
			encoder.stdin.write(chunk);
		}
		inStream.on("data", callback);
		console.log('client connected');

		req.connection.on("close", function() {

			// This occurs when the HTTP client closes the connection.
			encoder.stdin.end();
			inStream.removeListener("data", callback);
			console.log('client disconnected');
		});
	});

	// server methods
	Server.prototype.listen = function(port) {
		app.listen(port || 8001);
	}
}

