require('env2')('.env'); 
const Hapi = require('hapi');
const server = new Hapi.Server({ debug: { request: ['error'] } });

//const myServer = "http://www.myServer.com/" //this is example name of my domain.
const myServer = "http://192.168.1.13:" + process.env.PORT + "/"

const failedPromise = "Promise failed, please check your internet connection"
const tooManyResults = "This is impossible, something wrong with DB"


//used SQL requests
//query = 'SELECT shorturl FROM "public"."dataart" where longurl = \'' + thisUrl + '\';';
//query = 'SELECT shorturl FROM "public"."dataart" order by shorturl desc limit 1';
//query = 'INSERT INTO "public"."dataart" ("shorturl", "longurl") VALUES (\'' + newShortUrl + '\', \'' + thisUrl + '\');'
//query = 'SELECT longurl FROM "public"."dataart" where shorturl = \'' + shortURL + '\';';

const start = async() => {
	const server = new Hapi.Server({ debug: { request: ['error'] } });
	server.connection({ 
		//host: 'localhost',
		port: process.env.PORT });

	server.register( [
		require('hapi-postgres-connection'), 
		require('inert'), 
		require('vision'),
		require('hapi-error')
		], (err) => {
	  if (err) {
	    throw err;
	  }
	});

	server.views({
		engines:{
			html: require('handlebars')
		},
		path: './views',
		layout: 'default-layout'
	})



	server.route([
		{ //this route is responsible for saving new long URLS in DB. the format is localhost/?url=XXX, where xxx is valid URL.
		  //variable name is defined as url
		  //example http://192.168.1.13:3000/?url=www.ee will work
		  //and http://192.168.1.13:3000/?url=marcus will not work

		  	method: 'POST', //using GET for simplicity
		  	path: '/',
		  	handler: function(request, reply) {

			  	if (request.payload.url){
			  		var thisUrl = request.payload.url
			  		if(validURL(thisUrl)){
			  			//chech if such URL already exists
			  			var query = 'SELECT shorturl FROM "public"."dataart" where longurl = \'' + thisUrl + '\';';
			  			//console.log(query)
			  			sendPSQLRequest(request, query).then(function(result) {
			  				//console.log(doesAlreadyExist(result, reply))
							if (doesNotExist(result)){ 
								query = 'SELECT shorturl FROM "public"."dataart" order by shorturl desc limit 1';
								sendPSQLRequest(request, query).then(function(result) {
									newShortUrl = generateNextShortUrl(result); 
									query = 'INSERT INTO "public"."dataart" ("shorturl", "longurl") VALUES (\'' + newShortUrl + '\', \'' + thisUrl + '\');'
									sendPSQLRequest(request, query).then(function(result) {
										reply.view('index.html',{
						    				success: true,
						    				message: "Your short URL is: " + myServer + newShortUrl
						    			})
									}).catch(function(error){
										reply(failedPromise)
									})	
								}).catch(function(error){
									reply(failedPromise)
								})	
							} else { //URL already exists
								if (result.rows.length == 1){
									reply.view('index.html',{
						    				success: true,
						    				message: "URL already exists: " + myServer + result.rows[0].shorturl
						    		})
								} else {// result.rows.length > 1 should not be possible due to DB constraints
									reply(tooManyResults)
								}	
							}
						}).catch(function(error){
							console.log(error);

						})	
			  		} else {
			  			//reply.redirect("/")
			  			reply.view('index.html',{
	    					success: false,
	    					message: "Please provide valid URL"
	    				})
			  		}
			  	} else {
			  		reply.redirect("/")
			  	}
			    return
		  	}
		},
		{	//this route responsible for finding a link by short url and forwarding the page
			method: 'GET',
			path: '/{shortUrl*}',
		    handler: (request, reply) => {
	    		const params = request.params
	    		if (params.shortUrl == 'favicon.ico') {
	    			reply("wtf")// do nothing
	    		} else if (/^([a-zA-Z]{6})$/.test(params.shortUrl)){
	    			//try to find the short URL in the DB
	    			redirectToLongURL(request, reply, params.shortUrl)
		    	} else {
		    		reply.view('404.html',{
						success: false,
						message: "Please provide short URL in valid format (6 letters a-z and A-Z)"
					})
		    	}
		    	return
			}
		},
		{	//this route just generates the first page
			method: 'GET',
			path: '/',
		    handler: (request, reply) => {
	    		//const params = request.params
	    		reply.view('index.html',{
	    			success : false,
	    			message: ""
	    		})
		    	return 
			}
		}
	]);

	
	server.start(function() {
  		console.log('Visit: http://127.0.0.1:'+server.info.port);
	});

}
start();

function generateNextShortUrl(result){
	//could do the other way increment, but there is no point really, so it goes AAAAAA -> BAAAAA -> CAAAAA etc.
	//then go small letters A->Z->a->z, then it starts over.
	//In total there is 26^12 = 19,770,609,664 links. Can be easily extended to 7 or 8 characters.
	//8 characters will give us 43,608,742,899,428,874,059,776‬ links
	if(result){
		var urlCode = result.rows[0].shorturl.split("");
		var increment = 1
		for (var i = 0; i < urlCode.length; i++) {
			if(increment == 0){
				break; //nothing else to increment
			}
			var charCode = urlCode[i].charCodeAt(0);
			//console.log(charCode)
			charCode = charCode + increment;
			//console.log(charCode)
			increment = 0
			if(charCode > 90 && charCode < 97){
	  			charCode = 97
	  		} else if (charCode > 122) {
	  			charCode = 65
	  			increment = 1
	  			//continue
	  		} else{

	  		}
	  		urlCode[i] = String.fromCharCode(charCode)
	  		//console.log(urlCode)
		}
		return urlCode.join("")
	} else {
		return "AAAAAA"
	}
}

function validURL(str) { //just checking that the string is a valid URL, otherwise not save
  var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return !!pattern.test(str);
}


function doesNotExist(result){
	if(!result){
		return true
	} else if(result.rows.length >= 1) {		
		return false
	} else {
		return true
	}
}


function redirectToLongURL(request, reply, shortURL){
	var query = 'SELECT longurl FROM "public"."dataart" where shorturl = \'' + shortURL + '\';';
	var err = null
	var response = null
	sendPSQLRequest(request, query).then(function(result) {
		if(result.rows.length == 1) {
			//only 1 entry found, so it's all good => redirect
			reply.redirect(generateFullURL(result.rows[0].longurl));
		} else if (result.rows.length > 1) {
			reply.view('404.html',{
				success: false,
				message: tooManyResults
			})
		} else {
			reply.view('404.html',{
				success: false,
				message: "Short URL not found. Please provide correct short URL"
			})
		}
	}).catch(function(error){
		reply(failedPromise);

	})
}

function sendPSQLRequest(request, query){
	return new Promise(function(resolve, reject) {
		request.pg.client.query(query, function(err, result) {
			if(err) {
		    	reject(err)
			} else {
		    	resolve(result)
			}
		})
	})
}

function generateFullURL(myURL){ //covers both HTTPS and HTTP
	if(myURL.toUpperCase().search("HTTP") >= 0){
		return myURL
	} else {
		return ("http://" + myURL)
	}
}

module.exports = {
	generateFullURL,
	doesNotExist,
	validURL,
	generateNextShortUrl
}