#!/usr/bin/env node
require('pkginfo')(module, 'version');

var util = require('util');
var teslams = require('../teslams.js');
var argv = require('optimist')
    .usage('Usage: $0 -cdw')
    .boolean(['c', 'd', 'w'])
    .describe('c', 'Display the charge state')
    .describe('d', 'Display the drive state')
    .alias('d', 'drive')
    .alias('w', 'wake')
    .describe('w', 'Wake up the car telemetry')

// get credentials either from command line or config.json in ~/.teslams/config.js
var creds = require('./config.js').config(argv);
argv = argv.argv;

function pr( stuff ) {
    console.log( util.inspect(stuff) );
}

function parseArgs( vehicle ) {
    var vid = vehicle.id, err;
    // wake up the car's telematics system
    if (argv.w) {
        teslams.wake_up( vid, pr );
    }

    if (argv.c) {
        teslams.get_charge_state( vid, function ( cs ) {
            if (argv.metric) {
                if (cs.battery_range !== undefined) cs.metric_battery_range = (cs.battery_range * 1.609344).toFixed(2);
                if (cs.est_battery_range !== undefined) cs.metric_est_battery_range = (cs.est_battery_range * 1.609344).toFixed(2);
                if (cs.ideal_battery_range !== undefined) cs.metric_ideal_battery_range = (cs.ideal_battery_range * 1.609344).toFixed(2);
            } 
            pr(cs);
        } );
    }
    if (argv.d) {
        teslams.get_drive_state( vid, function (ds) {
            console.log( typeof ds.speed);
            if (argv.metric && typeof ds.speed !== "undefined") {
                if (ds.speed === null) {
                    ds.metric_speed = null;
                } else {
                    ds.metric_speed = (ds.speed * 1.609344).toFixed(0);
                }
            }
            pr(ds);
        });
    }
}

teslams.all( { email: creds.username, password: creds.password }, function ( error, response, body ) {
    var data, vehicle;
    //check we got a valid JSON response from Tesla
    try { 
        data = JSON.parse(body); 
    } catch(err) { 
        pr(new Error('login failed')); 
        process.exit(1);
    }
    //check we got an array of vehicles and get the first one
        if (!util.isArray(data)) {
        pr(new Error('expecting an array from Tesla Motors cloud service'));
        process.exit(1);
    }
        vehicle = data[0];
    //check the vehicle has a valid id
    if (vehicle.id === undefined) {
        pr( new Error('expecting vehicle ID from Tesla Motors cloud service'));
        process.exit(1);
    }
    if (argv.all) { pr(body); }
    // first some checks to see if we should even continue
    if (argv.isawake && vehicle.state == 'asleep') {
        pr(new Error('exiting because car is asleep'));
        process.exit(1);
    } else if (argv.isplugged) { 
        // safe to call get_charge_state because not asleep or don't care
        teslams.get_charge_state( vehicle.id, function ( cs ) { 
            if (cs.charging_state == 'Disconnected') {
                pr( new Error('exiting because car is not plugged in'));
                process.exit(1);
            } else { 
                // passed through all exit condition checks 
                parseArgs( vehicle );
            }
        });
    } else {
        // passed through all exit condition checks 
        parseArgs( vehicle );
    }
});
