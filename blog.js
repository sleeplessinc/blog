
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
top_content = fs.readFileSync("docroot/content.html", "utf8"); 

var send = require('send');


GET = function(req, res, qry) {

	var path = qry.pathname;				// raw path from GET line
	if(path.includes("..")) {
		r404(res, "naughty path: "+path);	// naughty path
		return;
	}

	path = path.substr(1);					// remove leading slash
	path = path.replace( /\/+$/, "" ); 		// remove trailing slashes
	if(path == "") {
		path = "home";
	}

	path = "docroot/"+path;
	var dirs = path.split("/");
	//I("dirs="+o2j(dirs));
	var paths = [];
	var p = ".";
	dirs.forEach(function(dir, i) {
		p += "/"+dir;
		paths[i] = p;
	});
	//I("paths="+o2j(paths));
	bodys = [];
	var left = paths.length;
	var problems = false;
	var meet = new Meet();
	paths.forEach(function(path, i) {
		meet.start(function(done) {
			var p = path+"/content.html";
			//I("reading "+p);
			fs.readFile(p, "utf8", function(err, body) {
				if(err) {
					p = path+".txt";
					//I("reading "+p);
					fs.readFile(p, "utf8", function(err, text) {
						if(err) {
							problems = true;
						}
						else {
							I("loaded "+text);
							var lines = text.split( /\n/ );
							var data = {};
							for(var i = 0; i < lines.length; i++) {
								var line = lines.shift().trim();
								if(line == "") {
									break;
								}
								var m = line.match( /^([-A-Za-z0-9]+): (.*)$/ );
								if(!m) {
									lines.unshift(line);
									break;
								}
								data[m[1]] = m[2];
							}

							data["body"] = lines.join("\n");
							bodys[i] = data;
						}
						done();
					});
				}
				else {
					body = body || null;
					if(body) {
						I("loaded "+p);
						bodys[i] = body;
					}
					done();
				}
			});
		});
	});
	var html = "{{content}}"
	meet.allDone(function() {
		//I("all done");
		if(problems) {
			r404(res, "no content found: "+path);
			return;
		}
		bodys.forEach(function(body, i) {
			if(typeof body == "string") {
				html = html.replace( /{{content}}/, body );
			}
			else
			if(typeof body == "object") {
				for(var k in body) {
					var re = new RegExp( "{{"+k+"}}", "g" );
					html = html.replace( re, body[k] );
				}
			}
		});
		res.writeHead(200, {"ContentType": "text/html"});
		res.write(html);
		res.end();
	});

}



	/*
	send(req, qry.pathname, {root: 'docroot'}).on("error", function(e) {
		r500(res, "Not found: "+qry.pathname);
	}).pipe(res);
	*/
