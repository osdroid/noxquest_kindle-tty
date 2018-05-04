const PORT = 20001;
const KINDLE_COLS = 63;
const KINDLE_LINES = 28;

const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const terminal_js = require('terminal.js');
const terminal = new terminal_js({columns: KINDLE_COLS, rows: KINDLE_LINES});

var wsClients = [];

const server = http.createServer((request, response) => {
    const url = request.url;
    console.log("URL: " + url);
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
	wsClients = wsClients.filter( e => e !== socket );
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
server.listen(PORT);

const processLine = function(bufferLine) {
    var htmlLine = bufferLine.str
	.replace(/&/g, '&#038;')
	.replace(/ /g, '&#160;')
	.replace(/</g, '&#060;')
	.replace(/>/g, '&#062;')
	.replace(/"/g, '&#034;')
	.replace(/'/g, '&#039;') + "<br/>";
    var attrs = bufferLine.attr;
    var styled = false;
    for (var idx in attrs) {
	const attr = attrs[idx];
	if (attr.fg !== null || attr.bg !== null)
	    styled = true;
    }
    if (!styled)
	return htmlLine;


    const replace = {
	'&': '&amp;',
	' ': '&nbsp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
    }
    var inSpan = false;
    var original = bufferLine.str;
    var result = "";
    for (var i = 0; i < original.length; i++) {
	if (attrs[i] && (attrs[i].fg !== null || attrs[i].bg !== null)) {
	    if (inSpan)
		result += '</span>';
	    inSpan = true;
	    result += '<span class="';
	    if (attrs[i].fg !== null)
		result += "f" + attrs[i].fg;
	    if (attrs[i].bg !== null)
		result += " b" + attrs[i].bg;
	    result += '">';
	}
	var c = original.charAt(i);
	result += replace[c] || c;
    }
    if (inSpan)
	result += '</span>';
    result += '<br/>';
    return result;
}

const fifo = fs.createReadStream('bridge');
fifo.on('data', data => {
    setTimeout(function() {
	var contenido = "";
	for (var i = 0; i < KINDLE_LINES; i++)
	    contenido += processLine(terminal.state.getLine(i));
	sendMessage(contenido);
    }, 0);
});
fifo.pipe(terminal);
console.log("Listening on port " + PORT);
