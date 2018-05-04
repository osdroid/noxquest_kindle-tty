const PORT = 20001;
const KINDLE_COLS = 63;
const KINDLE_LINES = 28;

const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const terminal_js = require('terminal.js');
const terminal = new terminal_js({columns: KINDLE_COLS, rows: KINDLE_LINES});
const WsHixie = require('ws-plus-hixie');



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
const wsBridge = new WsHixie(server);

const sendMessage = function(message, cursor) {
    const json = JSON.stringify({ msj : message, cursor : cursor });
    wsBridge.send(json);
}
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
	sendMessage(contenido, terminal.state.cursor);
    }, 0);
});
fifo.pipe(terminal);
console.log("Listening on port " + PORT);
