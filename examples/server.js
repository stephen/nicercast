var Throttle = require('throttle');
var NicerCast = require('../index.js');

// Stdin is expecting raw PCM data of the format:
var SAMPLE_SIZE = 16    // 16-bit samples, Little-Endian, Signed
  , CHANNELS = 2        // 2 channels (left and right)
  , SAMPLE_RATE = 44100 // 44,100 Hz sample rate.

// If we're getting raw PCM data as expected, calculate the number of bytes
// that need to be read for `1 Second` of audio data.
var BLOCK_ALIGN = SAMPLE_SIZE / 8 * CHANNELS // Number of 'Bytes per Sample'
  , BYTES_PER_SECOND = SAMPLE_RATE * BLOCK_ALIGN
var throttle = new Throttle(BYTES_PER_SECOND);
var stream = process.stdin;

var server = new NicerCast(stream);
server.start();