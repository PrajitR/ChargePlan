var fs = require('fs');
require('get_tesla_data')();

function getInitialCharge() {
  var initialCharge = 100,
      body = fs.readFileSync('tesla.out').toString().split('\n');

  for (var i = body.length - 1; i >= 0; i--) { // Pick out valid part of file.
    if (body[i].indexOf('battery_level:') != -1) { // Pick out the last object.
      initialCharge = +(body[i].split(':')[1].slice(0, -1));
      console.log(initialCharge);
      return initialCharge;
    }
  }
  return initialCharge;
}

if (require.main === module) {
  getInitialCharge();
}
exports.getInitialCharge = getInitialCharge;
