
/*
 * GET home page.
 */
var gapi = require('../gapi'),
    request = require('request'),
    qs = require('querystring');

exports.index = function indexRoute(req, res){
  res.render('index.jade', { url: gapi.url });
};

exports.oauthcallback = function oauthcallback(req, res) {
  var code = req.query.code;
  gapi.client.getToken(code, function(err, tokens) {
    if (err) console.log(err);
    gapi.client.credentials = tokens;
    getData();
  });
  res.render('index.jade', { url: 'http://google.com' });
};

function getData() {
  gapi.cal.events.list({ calendarId: 'prajitram@gmail.com' }).withAuthClient(gapi.client).execute(
    function(err, results) {
      if (err) console.log(err);
      locationsAndTimes(results);
    }
  );
}

function locationsAndTimes(data) {
  var valid = [], items = data.items, now = Date.now();
  for (var i = 0; i < items.length; i++) {
    var item = items[i],
        location = item.location,
        start = new Date(item.start.datetime),
        end = new Date(item.end.datetime);

    if (location) {
      valid.push({ location: location, start: start, end: end });
    }
  }
  
  getDistances(valid);
}

function getDistances(valid) {
  var home = '10285 Parkwood Drive',
      baseurl = 'http://maps.googleapis.com/maps/api/distancematrix/json?',
      distances = [];
  for (var i = 0; i < valid.length; i++) {
    var v = valid[i],
      qloc = qs.stringify({ 'origins': home, 'destinations': v.location });
    request(baseurl + qloc, function (error, response, body) {
      var mileString = JSON.parse(body)['rows']['elements']['distance']['text'],
          dist = +(mileString.split(' ')[0]);
      distances.push({ start: v.start, end: v.end, dist: dist });
    });
  }
  console.log(distances);
}
