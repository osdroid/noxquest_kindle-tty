const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const port = 20001;

const wsClients = [];

const server = http.createServer((request, response) => {
    const url = request.url;
    if (url === '/' || url === '/index.html') {
	response.setHeader('Content-Type', 'text/html');
	fs.createReadStream('index.html').pipe(response);
    } else if (url === '/client.js') {
	response.setHeader('Content-Type', 'application/javascript');
	fs.createReadStream('client.js').pipe(response);
    }
});

const sendMessage = function(message) {
    if (wsClients.length === 0)
	return;
    const json = new Buffer(
	JSON.stringify({ msj : message }));
    const outBuffer = new Buffer(json.length + 2);
    outBuffer.writeUInt8(0, 0);
    json.copy(outBuffer, 1);
    outBuffer.writeUInt8(255, outBuffer.length - 1);
    wsClients.forEach(e => {
	e.write(outBuffer, 'binary', err => {
	    if (err)
		console.log(err);
	});
    });
}

server.on("upgrade", (req, socket, head) => {
    socket.on('error', err => {
	try { socket.destroy(); } catch(e) {}
    });
    socket.on('close', () => {
	wsClients = wsClients.filter( e => e !== wsClient );
	console.log((new Date()) + " Disconnected");
    });
    // only outdated hixie-76 protocol
    // inspired on the deprecated ws-pure
    if (req && req.headers && req.headers['sec-websocket-key1']) {
	socket.setTimeout(0);
	socket.setNoDelay(true);
	const NONCE_LENGTH = 8;
	const key1 = req.headers['sec-websocket-key1'];
	const key2 = req.headers['sec-websocket-key2'];
	const nonce = head.slice(0, NONCE_LENGTH);
	const processKey = function(key) {
	    const n = parseInt(key.replace(/[^\d]/g, ''));
	    const spaces = key.replace(/[^ ]/g, '').length;
	    if (spaces === 0 || n % spaces !== 0){
		console.log("ERROR: Hixie Protocol, incorrect key [" + key + "]");
		return;
            }
	    return n / spaces;
	}
	const answer = new Buffer(4 * 2 + NONCE_LENGTH);
	answer.writeInt32BE(processKey(key1), 0);
	answer.writeInt32BE(processKey(key2), 4);
	nonce.copy(answer, 8);
	var headers = [
	    'HTTP/1.1 101 WebSocket Protocol Handshake',
            'Upgrade: WebSocket',
            'Connection: Upgrade',
	    'Sec-WebSocket-Origin: ' + req.headers['origin'],
            'Sec-WebSocket-Location: ws://' + req.headers.host + req.url,
	    '',''
	];
	var headerBuffer = new Buffer(headers.join('\r\n'));
        var hashBuffer = new Buffer(
	    crypto.createHash('md5').update(answer).digest('binary'), 'binary');
        var handshakeBuffer = new Buffer(headerBuffer.length + hashBuffer.length);
        headerBuffer.copy(handshakeBuffer, 0);
        hashBuffer.copy(handshakeBuffer, headerBuffer.length);
	socket.write(handshakeBuffer, 'binary', function(err) {
	    if (!err) {
		wsClients.push(socket);
		console.log((new Date()) + " Connected!");
	    }
	});
    }
});
server.on("error", error => {
    if (error.code === "EADDRINUSE")
	console.log("ERROR: Port already in use");
    else
	console.log(error);
});
server.listen(port);
console.log("Listening on port " + port);
