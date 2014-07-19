
/*
 * GET home page.
 */
var gapi = require('../gapi');

exports.index = function indexRoute(req, res){
  res.render('index.jade', { url: gapi.url });
};

exports.oauthcallback = function oauthcallback(req, res) {
  var code = req.query.code;
  gapi.client.getToken(code, function(err, tokens) {
    gapi.client.credentials = tokens;
    getData();
  });
  res.render('index.jade', { url: 'http://google.com' });
};

function getData() {
  gapi.cal.events.list().withAuthClient(gapi.client).execute(function(err, results) {
    console.log(results);
  });
}
