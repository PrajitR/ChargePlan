var fs = require('fs');

function getInitialCharge() {
  var initialCharge = 100,
      body = fs.readFileSync('tesla.out').toString().split('\n');

  for (var i = body.length - 1; i >= 0; i--) { // Pick out valid part of file.
    if (body[i].indexOf('battery_level:') != -1) { // Pick out the last object.
      initialCharge = +(body[i].split(':')[1].slice(0, -1));
      return initialCharge;
    }
  }
  return initialCharge;
}

exports.getInitialCharge = getInitialCharge;
