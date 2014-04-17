var NicerCast = require('../index.js');

var server = new NicerCast(process.stdin, {});
server.start();