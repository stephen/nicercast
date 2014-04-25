var NicerCast = require('../index.js');

var server = new NicerCast(process.stdin, {});
server.start();

var x = 0;
setInterval(function() {
	server.setMetadata('Test Metadata ' + x++);
}, 1000);