var exec = require("child_process").exec;
var swich = require('./lib/gk.js');
var net = require('net');

var Service, Characteristic, Accessory, UUIDGen;

var accessory_prefix = "haier";// debug 'Accessory with the same UUID '

module.exports = function(homebridge) {
  Accessory = homebridge.platformAccessory;

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerPlatform("homebridge-haierplugin", "haierplug", HaierOsPlatform, true);    
}

function  HaierOsPlatform(log, config, api) {
  log("HaierOsPlatform Init");

  this.log = log;
  this.config = config || {"platform": "haierplug"};
  this.switches = this.config.switches || [];

  this.accessories = {};
  this.polling = {};

  if (api) {
    this.api = api;
    this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
  }
}

HaierOsPlatform.prototype.didFinishLaunching = function () {
    // Add or update accessories defined in config.json
  for (var i in this.switches) this.addAccessory(this.switches[i]);

  // Remove extra accessories in cache
  for (var name in this.accessories) {
    var accessory = this.accessories[name];
    if (!accessory.reachable) this.removeAccessory(accessory);
  }
}

// Method to add and update HomeKit accessories
HaierOsPlatform.prototype.addAccessory = function (data) {
  this.log("Initializing platform accessory '" + data.name + "'...");

  // Retrieve accessory from cache
  var accessory = this.accessories[data.name];

  if (!accessory) {
    // Setup accessory as SWITCH (8) category.
    var uuid = UUIDGen.generate(accessory_prefix + data.name);
    accessory = new Accessory(data.name, uuid, 8);

    // Setup HomeKit switch service
    accessory.addService(Service.Switch, data.name);

    // New accessory is always reachable
    accessory.reachable = true;

    // Setup listeners for different switch events
    this.setService(accessory);

    // Register new accessory in HomeKit
    this.api.registerPlatformAccessories("homebridge-haierplugin", "haierplug", [accessory]);

    // Store accessory in cache
    this.accessories[data.name] = accessory;
  }
    // Confirm variable type
  data.polling = data.polling === true;
  data.interval = parseInt(data.interval, 10) || 1;
  if (data.manufacturer) data.manufacturer = data.manufacturer.toString();
  if (data.model) data.model = data.model.toString();
  if (data.serial) data.serial = data.serial.toString();

  // Store and initialize variables into context
  var cache = accessory.context;
  cache.name = data.name;
  cache.on_cmd = data.on_cmd;
  cache.off_cmd = data.off_cmd;
  cache.state_cmd = data.state_cmd;
  cache.polling = data.polling;
  cache.interval = data.interval;
  cache.manufacturer = data.manufacturer;
  cache.model = data.model;
  cache.serial = data.serial;
  if (cache.state === undefined) {
    cache.state = false;
    if (data.off_cmd && !data.on_cmd) cache.state = true;
  }

  // Retrieve initial state
  this.getInitState(accessory);

  // Configure state polling
  if (data.polling && data.state_cmd) this.statePolling(data.name);
}

// Method to remove accessories from HomeKit
HaierOsPlatform.prototype.removeAccessory = function (accessory) {
  if (accessory) {
    var name = accessory.context.name;
    this.log(name + " is removed from HomeBridge.");
    this.api.unregisterPlatformAccessories("homebridge-haierplugin", "haierplug", [accessory]);
    delete this.accessories[name];
  }
}


// Method to restore accessories from cache
HaierOsPlatform.prototype.configureAccessory = function (accessory) {
  this.setService(accessory);
  this.accessories[accessory.context.name] = accessory;
}

// Method to setup listeners for different events
HaierOsPlatform.prototype.setService = function (accessory) {
  accessory.getService(Service.Switch)
    .getCharacteristic(Characteristic.On)
    .on('get', this.getPowerState.bind(this, accessory.context))
    .on('set', this.setPowerState.bind(this, accessory.context));

  accessory.on('identify', this.identify.bind(this, accessory.context));
}

// Method to determine current state
HaierOsPlatform.prototype.getPowerState = function (thisSwitch, callback) {
  var self = this;

  if (thisSwitch.polling) {
    // Get state directly from cache if polling is enabled
    this.log(thisSwitch.name + " is " + (thisSwitch.state ? "on." : "off."));
    callback(null, thisSwitch.state);
  } else {
    // Check state if polling is disabled
    this.getState(thisSwitch, function (error, state) {
      // Update state if command exists
      if (thisSwitch.state_cmd) thisSwitch.state = state;
      if (!error) self.log(thisSwitch.name + " is " + (thisSwitch.state ? "on." : "off."));
      callback(error, thisSwitch.state);
    });
  }
}

// Method to determine current state
HaierOsPlatform.prototype.getState = function (thisSwitch, callback) {
  var self = this;

  // Execute command to detect state
  exec(thisSwitch.state_cmd, function (error, stdout, stderr) {
    var state = error ? false : true;

    // Error detection
    if (stderr) {
      self.log("Failed to determine " + thisSwitch.name + " state.");
      self.log(stderr);
    }

    callback(stderr, state);
  });
}

// Method to set state
HaierOsPlatform.prototype.setPowerState = function (thisSwitch, state, callback) {
  var self = this;

  var cmd = state ? thisSwitch.on_cmd : thisSwitch.off_cmd;
  var notCmd = state ? thisSwitch.off_cmd : thisSwitch.on_cmd;
  var tout = null;


  var sock = new net.Socket();
  sock.connect('/Users/guokai/bbbbbb.sock',()=>{
    console.log('client connect!');
    sock.write('Hi, server!\n');
    sock.write('set on');
  });
  sock.on('data', (data)=>{
    console.log('client rev: ' + data.toString());
    sock.end();
  });
  sock.on('end',()=>{
    console.log('client end!');
  });
  // // Execute command to set state
  // exec(cmd, function (error, stdout, stderr) {
  //   // Error detection
  //   if (error && (state !== thisSwitch.state)) {
  //     self.log("Failed to turn " + (state ? "on " : "off ") + thisSwitch.name);
  //     self.log(stderr);
  //   } else {
  //     if (cmd) self.log(thisSwitch.name + " is turned " + (state ? "on." : "off."));
  //     thisSwitch.state = state;
  //     error = null;
  //   }

  //   // Restore switch after 1s if only one command exists
  //   if (!notCmd && !thisSwitch.state_cmd) {
  //     setTimeout(function () {
  //       self.accessories[thisSwitch.name].getService(Service.Switch)
  //         .setCharacteristic(Characteristic.On, !state);
  //     }, 1000);
  //   }

  //   if (tout) {
  //     clearTimeout(tout);
  //     callback(error);
  //   }
  // });

  // Allow 1s to set state but otherwise assumes success
  tout = setTimeout(function () {
    tout = null;
    self.log("Turning " + (state ? "on " : "off ") + thisSwitch.name + " took too long, assuming success." );
    callback();
  }, 1000);
}

// Method to retrieve initial state
HaierOsPlatform.prototype.getInitState = function (accessory) {
  var manufacturer = accessory.context.manufacturer || "Default-Manufacturer";
  var model = accessory.context.model || "Default-Model";
  var serial = accessory.context.serial || "Default-SerialNumber";

  // Update HomeKit accessory information
  accessory.getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, manufacturer)
    .setCharacteristic(Characteristic.Model, model)
    .setCharacteristic(Characteristic.SerialNumber, serial);

  // Retrieve initial state if polling is disabled
  if (!accessory.context.polling) {
    accessory.getService(Service.Switch)
      .getCharacteristic(Characteristic.On)
      .getValue();
  }

  // Configured accessory is reachable
  accessory.updateReachability(true);
}


// Method to handle identify request
HaierOsPlatform.prototype.identify = function (thisSwitch, paired, callback) {
  this.log(thisSwitch.name + " identify requested!");
  callback();
}
