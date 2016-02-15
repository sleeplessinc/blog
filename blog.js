
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

// finalize an HTTP transaction with a 404 'not found' response
r404 = function(res, s) {
	W("r404: "+s);
	res.writeHead(404);
	res.end("NOT FOUND");
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
shell = fs.readFileSync("docroot/shell.html", "utf8"); 

var send = require('send');


GET = function(req, res, qry) {
	try {
		var path = qry.pathname;
		throwIf(path.includes(".."), "naughty path: "+path);	// naughty path
		path = path.substr(1);									// removes leading slash
		path = path.replace( /\/+$/, "" ); 						// remove trailing slashes
		if(path == "") {
			path = "home";
		}

		path = "./docroot/"+path;
		I("path="+path);

		fs.readFile(path+"/content.html", "utf8", function(err, body) {

			if(err) {
				r404(res);
				return;
			}

			I("loaded body: "+body.substr(0, 40));

			var html = shell.replace( /{{content}}/, body );

			try {
				var article = require(path+"/content.json");
				I("loaded content.json");
				for(var k in article) {
					var re = new RegExp( "{{"+k+"}}", "g" );
					html = html.replace( re, article[k] );
				}
			}
			catch(e) {
				//W(e);
				//r404(res);
				//return;
			}

			res.writeHead(200, {"ContentType": "text/html"});
			res.write(html);
			res.end();
		});

		/*
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
		*/
	}
	catch(e) {
		r404(res, e.stack);
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



