


// Copyright 2016  Sleepless Software Inc.  All Rights Reserved


url = require('url');
util = require("util");
fs = require("fs");

sleepless = require("sleepless");
meet = require("meet");
require("g")("log5")(3);


dev = process.argv[2] == "dev";
if(dev) {
	I("DEVELOPMENT MODE");
}

failIf = function(c, err) {
	if(c) {
		var e = new Error(err || "Unspecified failure") 
		throw e	
	}
}


// finalize an HTTP transaction with a 500 error response
r500 = function(res, s) {
	W("r500: "+s);
	res.writeHead(500);
	res.end(s);
}


// create the http daemon
httpd = require('http').createServer(function(req, res) {
	D("incoming http connection");
	var method = req.method;
	I(method + " " + req.url);
	var fun = global[method];
	if(typeof fun === "function") {
		var qry = url.parse(req.url, true);
		fun(req, res, qry);
	}
	else {
		r500(res, "method not supported: "+method);
	}
});


// start the httpd listening for connections
port = process.env.PORT || 12345;
httpd.listen(port, function() {
	I("httpd listening on "+port)
});


//---------------------------

clients = {}; 	// holds client objects for those clients actively connected to this server
seq_client = 0;
shell = fs.readFileSync("docroot/shell.html"); 

var send = require('send');


GET = function(req, res, qry) {

	var path = qry.pathname.replace( /(^\/+)|((\.)\.+)+/g, "" );
	I("GET2: "+path);

	try {
		var article = require("./docroot/"+path);
		var html = ""+shell;
		for(var k in article) {
			var re = new RegExp( "{{"+k+"}}", "g" );
			html = html.replace( re, article[k] );
		}
		res.writeHead(200, {"ContentType": "text/html"});
		res.write(html);
		res.end();
		return;
	}
	catch(e) {
		r500(res, "Not found: "+e);
		return;
	}

	/*
	fs.readFile(path, function(e, s) {
		if(e) {
		}

	});

	send(req, qry.pathname, {root: 'docroot'}).on("error", function(e) {
		r500(res, "Not found: "+qry.pathname);
	}).pipe(res);
	*/
}







