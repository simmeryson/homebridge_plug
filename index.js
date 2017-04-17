var swich = require('./lib/gk.js');

var Service, Characteristic, Accessory, UUIDGen;

module.exports = function(homebridge) {
  Accessory = homebridge.platformAccessory;

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerPlatform("homebridge-haierplug", "haierplug", HaierOsPlatform, true);    
}

function  HaierOsPlatform(log, config, api) {
  log("HaierOsPlatform Init");

  this.log = log;
  this.config = config;
  this.yeeAccessories = [];

  var platform = this;

  if (api) {
    this.api = api;

    this.api.on('didFinishLaunching', function() {
        platform.log("DidFinishLaunching");
        }.bind(this));
  }
}

HaierOsPlatform.prototype = {
onDevFound: function(dev) {
              var that = this;
              var uuid;
              var found = 0;
              var newAccessory = null;
              var lightbulbService = null;
              var name;

              for (var index in this.yeeAccessories) {
                var accessory = this.yeeAccessories[index];
                if (accessory.context.did == dev.did) {
                  newAccessory = accessory;
                  found = 1;
                  break;
                }
              }

              if (found) {
                this.log("cached accessory: " + newAccessory.context.did);
                lightbulbService = newAccessory.getService(Service.Lightbulb);
              } else {
                uuid = UUIDGen.generate(dev.did);
                name = dev.did.name || dev.did.substring(dev.did.length-6);
                this.log("found dev: " + name); 
                newAccessory = new Accessory(name, uuid);
                newAccessory.context.did = dev.did;
                newAccessory.context.model = dev.model;
                lightbulbService = new Service.Lightbulb(name);     
              }


              dev.ctx = newAccessory;

              lightbulbService
                .getCharacteristic(Characteristic.On)
                .on('set', function(value, callback) { that.exeCmd(dev.did, "power", value, callback);})
                .value = dev.power;


              newAccessory.reachable = true;

              if (!found) {
                newAccessory.addService(lightbulbService, name);
                this.yeeAccessories.push(newAccessory);
                this.api.registerPlatformAccessories("homebridge-yeelight", "yeelight", [newAccessory]);
              }
            }, 
onDevConnected: function(dev) {
                  this.log("accesseory reachable");

                  this.log("dev connected " + dev.did + " " + dev.connected); 
                  var accessory = dev.ctx;
                  accessory.updateReachability(true); 
                },

onDevDisconnected: function(dev) {
                     this.log("accesseory unreachable");

                     this.log("dev disconnected " + dev.did + " " + dev.connected);  
                     var accessory = dev.ctx;

                     // updateReachability seems have bug, but remove the accessory will cause
                     // the name of the light gone, leave the user to decide...
                     if (1) {
                       accessory.updateReachability(false);        
                     } else {
                       this.api.unregisterPlatformAccessories("homebridge-yeelight", "yeelight", [accessory]);

                       var idx = this.yeeAccessories.indexOf(accessory);
                       if (idx > -1) {
                         this.yeeAccessories.splice(idx, 1);
                       }

                       this.yeeAgent.delDevice(dev.did);
                     }
                   },

configureAccessory: function(accessory) {
                      var platform = this;

                      //accessory.updateReachability(false);
                      accessory.reachable = true;

                      accessory.on('identify', function(paired, callback) {
                          platform.log("identify ....");
                          });

                      this.yeeAccessories.push(accessory);

                      return;
                    },

exeCmd: function(did, characteristic, value, callback) {

          dev = this.yeeAgent.getDevice(did);

          if (dev == null) {
            this.log("no device found for did: " + did);
            return;
          }

          switch(characteristic.toLowerCase()) {

            case 'identify':
              this.log("identfy....");
              dev.setBlink();
              break;
            case 'power':
              dev.setPower(value);
              break;
            case 'hue':
              dev.setColor(value, dev.sat);
              break;
            case 'brightness':
              dev.setBright(value);
              break;
            case 'saturation':
              dev.setColor(dev.hue, value);
              break;
            default:
              break;
          }

          if (callback)
            callback();
        },    
}
