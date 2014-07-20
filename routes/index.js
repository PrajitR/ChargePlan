
/*
 * GET home page.
 */
var gapi = require('../gapi'),
    request = require('request'),
    qs = require('querystring');

var home = '10285 Parkwood Drive',
    work = '425 Broadway St., Redwood City',
    now = new Date(),
    workStart = new Date(now.getFullYear(), now.getMonth(), now.getDay(), 9), // Start of workday.
    workEnd = new Date(now.getFullYear(), now.getMonth(), now.getDay(), 17), // End of workday.
    homeToWorkDistance = 17.3; // Change this later!

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
  var valid = [], 
      items = data.items, 
      now = Date.now();

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
  var baseurl = 'http://maps.googleapis.com/maps/api/distancematrix/json?',
      distances = [],
      lastPlace = home,
      v;

  for (var i = 0; i < valid.length; i++) {
    v = valid[i];

    if (i > 0) { // Must start at home before anything else.
      var v0 = valid[i - 1];
      if (timeDifference(v0.end, v.end) <= 30) { // Move from one non work location to another.
        lastPlace = v0.location;
      } else {
        // Get back to work.
        distances.push({ start: v0.end, v.start, distances[distances.length - 1].distance });
        lastPlace = work;
      }
    } else { 
      if (v.start.getHours() - workStart.getHours() >= 1) { // From home to work.
        distances.push({ start: workStart, end: v.start, distance: homeToWorkDistance });
      }
    }

    var qloc = qs.stringify({ 'origins': lastPlace, 'destinations': v.location });
    request(baseurl + qloc, function (error, response, body) {
      var mileString = JSON.parse(body)['rows']['elements']['distance']['text'],
          dist = +(mileString.split(' ')[0]);
      distances.push({ start: v.start, end: v.end, distance: dist });
    });
  }
  
  if (v.end.getHours() < workEnd.getHours()) {
    distances.push({ start: v.end, end: workEnd, distance: homeToWorkDistance }); // Work to home.
  }

  computeCharges(distances);
}

function timeDifference(t1, t2) {
  var time1 = t1.getHours() * 24 + t1.getMinutes(),
      time2 = t2.getHours() * 24 + t2.getMinutes();
  return time2 - time1;
}

function computeCharges(distances) {
  var milesPerChargePercent = 2.4, // Estimated 2.4 miles for every 1% of charge.  
      chargePerHouse = 12, // Estimated 12% battery level increase per hour.
      currentCharge = getInitialCharge(),
      chargingSchedule = [];

  for (var i = 0; i < distances.length; i++) {
    var d = distances[i];
    currentCharge -= d.distance * milesPerChargePercent;

    if (currentCharge < 10) { // Below 10% charge is too low for comfort.
      var idx = Math.max(i - 1, 0),
          d2 = distances[idx];
      chargingSchedule.push(d2.end);
      currentCharge = Math.min(100, chargePerHour * (d.end.getHours() - d2.end.getHours()));
    }
  }
}

function getInitialCharge() {
  var initialCharge = 100;
  return initialCharge;
}
