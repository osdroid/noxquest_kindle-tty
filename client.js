const COLOR_WAIT = "#42c2f4";
const COLOR_OK = "#1f7f39";
const COLOR_ERROR = "#c43131";
const setMessage = function(message) {
    consola.innerHTML = message;
};
var active = false;
const startListener = function() {
    if (active)
	return;
    active = true;
    wsConn = new WebSocket('ws://' + window.location.hostname + ":20001/prueba");

    wsConn.onopen = function() {
	setMessage("Active", COLOR_OK);
	wsConn.send("hola");
    }
    wsConn.onclose = function(e, code) {
		setMessage("Disconn. " + code + JSON.stringify(e), COLOR_ERROR);
//    	setMessage(JSON.stringify(e));
	active = false;
    }
    wsConn.onerror = function(e, code) {
	
	setMessage("ERROR " + code + e, COLOR_ERROR);
    }
    wsConn.onmessage = function(message) {
	try {
	    var datos = JSON.parse(message.data);
	    setMessage(datos.msj);
	} catch(e) {
	    setMessage("MSG ERROR", COLOR_ERROR);
	}
    }
}


const rotarContenedor = function() {
    contenedor.style.width = window.innerHeight + "px";
    contenedor.style.height = window.innerWidth + "px";
    contenedor.style.top = "-" + window.innerWidth + "px";
    contenedor.className = "rotado";
    startListener();
}
contenedor.addEventListener("click", rotarContenedor);
