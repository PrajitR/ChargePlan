var fs = require('fs'),
    tokens = JSON.parse(fs.readFileSync('api_ids.json')),
    googleapis = require('googleapis'),
    OAuth2Client = googleapis.OAuth2Client,
    client = tokens.client,
    secret = tokens.secret,
    redirect = 'http://localhost:3000/oauth2callback',
    calendar_auth_url = '',
    oauth2Client = new OAuth2Client(client, secret, redirect);

calendar_auth_url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: 'https://www.googleapis.com/auth/calendar'
});

googleapis
  .discover('calendar', 'v3')
  .discover('oauth2', 'v2')
  .execute(function(err, client) {
    if (!err) callback(client);
  });

function callback(clients) {
  exports.cal = clients.calendar;
  exports.oauth = clients.oauth2;
  exports.url = calendar_auth_url;
  exports.client = oauth2Client;
};
