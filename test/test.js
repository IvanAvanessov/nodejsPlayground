var expect  = require('chai').expect;
var chai = require('chai');
var request = require('request');
var assert = require('assert');
chai.use(require('chai-http'));

var myServer = require('../server.js')

describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', function() {
      assert.equal([1, 2, 3].indexOf(4), -1);
    });
  });
});

describe('Webpage', function() {
	it('Landing page content', function(done) {
	    request('http://localhost:3000' , function(error, response, body) {
	        expect(body.search("<html lang")).to.be.above(-1);
	        done();
	    });
	});
	describe('ShortURL tests', function() {
		it('too short', function(done) {
		    request('http://localhost:3000/a' , function(error, response, body) {
		        expect(body.search("Please provide short URL")).to.be.above(-1);
		        done();
		    });
		});
		it('too long', function(done) {
		    request('http://localhost:3000/aaaaaaa' , function(error, response, body) {
		        expect(body.search("Please provide short URL")).to.be.above(-1);
		        done();
		    });
		});
		it('non numeric', function(done) {
		    request('http://localhost:3000/!"£!$£%' , function(error, response, body) {
		        expect(body.search("400")).to.be.above(-1);
		        done();
		    });
		});
	});
	describe('LongURL tests', function() {
		it('not a url', function(done) {
		    chai.request('http://localhost:3000')
		    	.post('/')
		    	//.type('form')
		    	.set('content-type', 'application/x-www-form-urlencoded')
		    	.send({'url' : 'word'})
		    	.end( function(error, response) {
		    		//response.should.have.status(200);
		        	expect(response.text.search("Please provide valid URL")).to.be.above(-1);
		        	done();
		    });
		});
		it('existing URL', function(done) {
		    chai.request('http://localhost:3000')
		    	.post('/')
		    	//.type('form')
		    	//.set('content-type', 'application/x-www-form-urlencoded')
		    	.send({'url' : 'www.ee'})
		    	.end( function(error, response) {
		        	expect(response.text.search("URL already exists")).to.be.above(-1);
		        	done();
		    });
		});
		it('withour variable', function(done) {
		    chai.request('http://localhost:3000')
		    	.post('/')
		    	.send()
		    	.end( function(error, response) {
		        	expect(response.text.search("400")).to.be.above(-1);
		        	done();
		    });
		});
		it('with wrong variable', function(done) {
		    chai.request('http://localhost:3000')
		    	.post('/')
		    	.send({'urls' : 'www.ee'})
		    	.end( function(error, response) {
		    		assert.equal(response.statusCode, 200);
		        	expect(response.text.search("<html")).to.be.above(-1);
		        	done();
		    });
		});
	});
});

describe('Functions', function() {
  describe('generateFullURL', function() {
    it('should validate the URL input', function() {
      	assert.equal(myServer.generateFullURL('www.ee'), 'http://www.ee');

    });
    it('should validate the URL input', function() {
      	assert.equal(myServer.generateFullURL('https://www.ee'), 'https://www.ee');
      
    });
  });

  describe('validURL', function() {
    it('true if good URL', function() {
      	assert.equal(myServer.validURL('www.ee'), true); 
    });
    it('false if URL pattern is bad', function() {
    	assert.equal(myServer.validURL('wwwww....ee'), false);
      	assert.equal(myServer.validURL('ee'), false);
      	assert.equal(myServer.validURL('123'), false);
    });
  });
  describe('generateNextShortUrl', function() {

  	var result = {
  		rows: [{
  			shorturl: '1'
  		}]
  	}

    it('produces next valid short URL', function() {
    	console.log(result)

    	result.rows[0].shorturl = 'bbbbbb'
      	assert.equal(myServer.generateNextShortUrl(result), 'cbbbbb');
		result.rows[0].shorturl = 'cbbbbb'
      	assert.equal(myServer.generateNextShortUrl(result), 'dbbbbb');
      	result.rows[0].shorturl = 'dbbbbb'	
      	assert.equal(myServer.generateNextShortUrl(result), 'ebbbbb');
    });
    it('switches from upper case to lower case', function() {

    	result.rows[0].shorturl = 'Zbbbbb'
      	assert.equal(myServer.generateNextShortUrl(result), 'abbbbb');
      	result.rows[0].shorturl = 'zbbbbb'
      	assert.equal(myServer.generateNextShortUrl(result), 'Acbbbb');
      	result.rows[0].shorturl = 'zzzzzz'
      	assert.equal(myServer.generateNextShortUrl(result), 'AAAAAA');
    });
  });
  describe('doesNotExist', function() {

  	var result = {
  		rows: [{
  			shorturl: '1'
  		}]
  	}
    it('Checking is short url is returned for a given long URL', function() {

      	assert.equal(myServer.doesNotExist(result), false);
     	result = {
     		rows: {}
     	}
      	assert.equal(myServer.doesNotExist(result), true);
    });
  });
});