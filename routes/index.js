
/*
 * GET home page.
 */
var gapi = require('../gapi'),
    request = require('request'),
    qs = require('querystring'),
    fs = require('fs'),
    sendSMS = require('../sendSMS'),
    async = require('async');

var home = '10285 Parkwood Drive, Cupertino, CA',
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
  gapi.cal.events.list({ calendarId: 'chargeplan@gmail.com' }).withAuthClient(gapi.client).execute(
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
        start = new Date(item.start.dateTime),
        end = new Date(item.end.dateTime);

    if (location) {
      valid.push({ location: location, start: start, end: end });
    }
  }
  
  getDistances(valid);
}

function getDistances(valid) {
  var baseurl = 'http://maps.googleapis.com/maps/api/distancematrix/json?',
      distances = [],
      urls = [],
      lastPlace = home,
      v;

  /* for (var i = 0; i < valid.length; i++) {
    v = valid[i];

    if (i > 0) { // Must start at home before anything else.
      var v0 = valid[i - 1];
      if (timeDifference(v0.end, v.end) <= 30) { // Move from one non work location to another.
        lastPlace = v0.location;
      } else {
        // Get back to work.
        distances.push({ start: v0.end, end: v.start, distance: dist || 20.0 });
        lastPlace = work;
      }
    } else { 
      if (v.start.getHours() - workStart.getHours() >= 1) { // From home to work.
        distances.push({ start: workStart, end: v.start, distance: homeToWorkDistance });
      }
    }

    var qloc = qs.stringify({ 'origins': lastPlace, 'destinations': v.location, metric: 'imperial' });
    console.log(baseurl + qloc);
    request(baseurl + qloc, function (error, response, body) {
      var mileString = JSON.parse(body)['rows']['elements']['distance']['text'];
      dist = +(mileString.split(' ')[0]);
      console.log(lastPlace + ' //// ' + v.location + ' //// ' + dist);
      distances.push({ start: v.start, end: v.end, distance: dist });
    });
  }
  
  if (v.end.getHours() < workEnd.getHours()) {
    distances.push({ start: v.end, end: workEnd, distance: homeToWorkDistance }); // Work to home.
  }
  */

  function mapRequest(url) {
    return function(callback) {
      request(url, function (error, response, body) {
        var mileString = (JSON.parse(body))['rows'][0]['elements'][0]['distance']['text'],
            dist = +(mileString.split(' ')[0]);
        callback(error, dist);
      });
    };
  }

  for (var i = 0; i < valid.length; i++) {
    v = valid[i];
    var qloc = qs.stringify({ 'origins': lastPlace, 'destinations': v.location, units: 'imperial' });
    urls.push(mapRequest(baseurl + qloc));
    lastPlace = v.location;
  }

  async.parallel(urls, function(err, results) {
    for (var i = 0; i < valid.length; i++) {
      v = valid[i];
      distances.push({ start: v.start, end: v.end, distance: results[i] });
    }
    computeCharges(distances);
  });
}

function timeDifference(t1, t2) {
  var time1 = t1.getHours() * 24 + t1.getMinutes(),
      time2 = t2.getHours() * 24 + t2.getMinutes();
  return time2 - time1;
}

function computeCharges(distances) {
  var milesPerChargePercent = 2.4, // Estimated 2.4 miles for every 1% of charge.  
      chargePerHour = 12, // Estimated 12% battery level increase per hour.
      currentCharge = getInitialCharge(),
      chargingSchedule = [];

  for (var i = 0; i < distances.length; i++) {
    var d = distances[i];
    currentCharge -= d.distance / milesPerChargePercent;

    if (currentCharge < 10) { // Below 10% charge is too low for comfort.
      var idx = Math.max(i - 1, 0),
          d2 = distances[idx];
      chargingSchedule.push(d2.end);
      currentCharge = Math.min(100, 
          currentCharge + d.distance / milesPerChargePercent + chargePerHour * (d.end.getHours() - d2.end.getHours())); // How much additional charge.
    }
  }

  if (chargingSchedule.length > 0) {
    sendSMS(chargingSchedule[0]);
  }
  insertEvents(chargingSchedule);
}


function getInitialCharge() {
  /*var initialCharge = 100,
      body = fs.readFileSync('tesla.out').toString().split('\n'),
      info;

  for (var i = body.length - 1; i >= 0; i--) { // Pick out valid part of file.
    if (body[i].indexOf('{') != -1) { // Pick out the last object.
      info = body.slice(i);
      break;
    }
  }
  info = eval(info.join('')); // Otherwise it's a pain to convert to a valid JSON.

  initialCharge = info['battery_level'];
  */
  return 20;
}

function insertEvents(schedule) {
  for (var i = 0; i < schedule.length; i++) {
    var s = schedule[i],
        e = new Date(s.getTime() + 10 * 60000); // Add ten minutes to start time.
    gapi.cal.events.insert({ calendarId: 'chargeplan@gmail.com', sendNotifications: true }, 
        { start: { dateTime: s.toISOString() }, end: { dateTime: e.toISOString() }, 
          summary: 'Charge Tesla Model S',
          description: 'You need to charge your Model S to make your next trip.' })
      .withAuthClient(gapi.client).execute(
        function(err, results) {
          if (err) console.log(err);
          console.log(results);
        }
    );
  }
}
