var fs = require('fs'),
    tokens = JSON.parse(fs.readFileSync('twilio.json')),
    client = require('twilio')(tokens.sid, tokens.auth),
    userNumber = '+16502072155';

function sendMessage() {
  client.sendMessage({
    to: userNumber,
    from: '+16502410131',
    body: "You need to plug in your Tesla now so you don't run out of charge."
  }, function (err, responseData) {
    if (err) console.log(err);
  });
}

exports.sendMessage = sendMessage;
