/**
 * ble-impl-noble.js - ble access implementation based on noble
 * Author: abun, kobucom
 * License: GPL
 * 
 *  Copyright (C) 2019  Kobu.Com
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 */

// 19-oct-04 generic skelton written, tested
// 19-oct-05 noble version started on windows with csr dongle
// 19-oct-05 scan device, service and characteristics; characteristic read/write ok
// 19-oct-08 connection cache, disconnector, tested with test-revised.sh
// 19-oct-09 event stream written, tested
// 19-oct-14 two-phase discoverServices/discoverCharacteristics -> one-shot discoverAllServicesAndCharacteristics

// published functions:
// module.exports.init = function() { ... }
// module.exports.readCharacteristic = function(address, charaUuid, cb) { ... }
// module.exports.writeCharacteristic = function(address, charaUuid, value, noAck, cb) { ... }
// module.exports.subscribe = function(address, charaUuid, cb) { ... }
// module.exports.getNodes = function(connectable) { ... }
// module.exports.getNode = function(address) { ... }
// module.exports.getServices = function (address) { ... }
// module.exports.getCharacteristics = function(address, serviceUuid) { ... }
    
// reference to noble module
const noble = require('noble');

// request/response value conversion
const vutil = require('./value');

// configuration
const config = require('./config');

// list of advertised devices, noble 'peripheral' reported through 'discover' event.
// once entered, never deleted, entry updated if discovered again
// peripheral.address (eg. 'c0:ab:2a:6a:1a:89') is used as a key
// TODO: probably 'id' is better?
// [ peripheral { address: <address>, ...}, ... ] 
var peripherals = [];

// connection cache - list of information about a connected peer
// once entered, never deleted, entry updated if referenced again
// a new entry is created on the first connection to the peer
// [ { address: <address>,
//     services: [ s1, s2, ... ],
//     characteristics: [ c1, c2, ... ], // has uplink of _serviceUuid
//     timestamp: <timestamp> },
//   { ... }, ...
// ]
// keyed by 'address'. 
// 'services' and 'characteristics' are array of noble objects respectively
// 'timestamp' is unix time in milliseconds; represents the last accessed time
// while connected or zero if not connected
// see populateCharacteristics() and disconnector()
var connections = [];

// initialize - must be called before any call to ble-impl
module.exports.init = function() {
    noble.on('stateChange', function(state) {
        console.log("state = " + state);
        if (state === 'poweredOn') {
            console.log('starting scan ...');
            peripherals = []; // clear caches
            connections = [];
            // In noble, default is active scan; changeable with an environment variable.
            // Passing a list of devices work as a whitelist (I have no idea how noble implements it)
            noble.startScanning([], config.BLE_NOBLE_ALLOW_DUPLICATES, (e) => {
                if (e) console.log("startScanning failed: " + e);
            });
        }
        else if (state === 'poweredOff') {
            console.log('power off');
        }
    });

    noble.on('discover', function(peripheral) {
        console.log("discover: addr: " + peripheral.address + ', id: ' + peripheral.id);
        let index = peripherals.findIndex(p => vutil.compare(p.address, peripheral.address));
        if (index === -1) {
            console.log(" add: " + peripheral.address);
            peripherals.push(peripheral);
            if (peripheral.connectable && vutil.compare(peripheral.address, "c0:ab:2a:6a:1a:89")) { // test
                setImmediate( () => {
                    getConnection(peripheral.address, (err, con) => {
                        if (err) { console.log("preload: " + err.toString()); }
                    });
                });
            }
            else {
                // test - tried pre-connection service/chara scan ... not working
                // peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
                //     if (error) { console.log("discoverAllServicesAndCharacteristics: " + error); return; }
                //     console.log("discoverAllServicesAndCharacteristics: " + services);
                //     console.log("discoverAllServicesAndCharacteristics: " + characteristics);
                // });
                // test result:
                //  Noble does not call the callback supplied and shows the following message instead:
                //  noble warning: unknown peripheral a8a795c6ff9a
            }
        }
        else {
            console.log(" update: " + peripheral.address); // overwrite even if allow duplicate
            peripherals[index] = peripheral;
            // TODO: if allow-duplicate enabled, every advertise broadcast is handed up to app
            // even if the adversise data is the same or different. This means too many packets!
            // In order to handle differnt advertise broadcast from the same device,
            // app should check whether tha data is different or the same.
        }
    });

    noble.on('scanStop', function() {
        console.log('scan stopped');
    });

    // schedule disconnector
    // check tje connection cache periodically and disconnect a peer with no activity for a long time.
    // 'timestamp' is checked to see if the connection is unused for a specified time.
    // cf. disconnected callback clears the timestamp to zero.
    setInterval(() => {
        console.log("disconnector: called");
        let now = Date.now();
        for (let i = 0; i < connections.length; i++) {
            let con = connections[i];
            if (con.timestamp !== 0 && con.timestamp + config.BLE_KEEP_INTERVAL < now) {
                let peripheral = peripherals.find(p => vutil.compare(p.address, con.address));
                if (!peripheral) {
                    console.log("disconnector: no peripheral found for " + con.address);
                    continue;
                }
                console.log("disconnector: stale " + peripheral.address + " (" + peripheral.state + ")");
                if (peripheral.state === "connected") {
                    peripheral.disconnect((err) => {
                        console.log("disconnector: " + (err ? err.toString() : "done"));
                    });
                }
            }
        }
    }, config.BLE_CHECK_INTERVAL);
}

// this function is called if an access is required to any characteristic of a node
// prior to doing so, a connection should be made and list of characteristics should be obtained.
//
// getConnection() calls a passed callback with a connection entry after making sure:
//  - a connection is made to the peer
//  - its services and characteristics are queried
// it creates a connection cache entry (if not already made) and/or makes a connection (if not already connected).
// it populates services and characteristics for the first time a connection is made.
// The timestamp is updated each time a call is made to getConnection()
function getConnection(address, cb) { // connection entry is passed as an argument to the callback: cb(err, con)

    let peripheral = peripherals.find(p => vutil.compare(p.address, address));
    if (!peripheral) {
        cb("no such peripheral: " + address);
        return;
    }

    console.log("getConnection: " + address + " (" + peripheral.state + " on entry)");
 
    // get or allocate connection cache entry
    let con = connections.find(c => vutil.compare(c.address, address));
    if (!con) {
        con = { address: address, services: null, characteristics: null, timestamp: 0 };
        connections.push(con);
    }

    // update timestamp if already connected
    if (peripheral.state === "connected") {
        con.timestamp = Date.now();
        cb(null, con);
        return;
    }

    // connect to peer device
    peripheral.connect((err) => {
        if (err) { 
            console.log("getConnection: connect: " + err);
            cb(err);
            return;
        }

        // peripheral.once('connect', () => {}); - same as the callback above?

        // setup disconnect callback
        peripheral.once('disconnect', () => {
            let address = peripheral.address;
            console.log("disconnected-callback: " + address);
            con.timestamp = 0; // mark disconnected
            // TODO: unsubscribe chara if subscribed; saw nRF52 app fails on disconnect without unsubscribe
        });

        // now connected
        con.timestamp = Date.now();
        if (con.services) { // service info already set
            cb(null, con);
            return;
        }

        // populate service info
        populateCharacteristics(peripheral, con, cb);
    });
}

// this function is called within getConnection() when a connection is made for the first time.
// populateCharacteristics() sets lists of services and characteristics to the connection cache entry.
function populateCharacteristics(peripheral, con, cb) { // callback: cb(err, con)

    // single noble api for doing this is:
    //   peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {});
    //     services: [service, service, ...]
    //     characteristics: [ characteristic, characteristic, ...] each contains _serviceUuid uplink
    // two-phase api:
    //   peripheral.discoverServices([], function (err, services) {
    //     services.forEach(function (service) {
    //       service.discoverCharacteristics([], function (err, characteristics) {
    //         con.map.push({ service: service, characteristics: characteristics });
    // I chose to use the former due to easyness of implementing a callback.

    peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
        if (error) {
            cb(error);
            return;
        }

        console.log(' found services: ', services.toString());
        console.log(' found characteristics: ', characteristics.toString());

        // set what we got
        con.services = services;
        con.characteristics = characteristics;

        // kick the caller when everything is ready.
        cb(null, con);
    })
}

// search a connection cache entry and find a characteristic for a specified uuid.
// first one found in the characteristics list is returned.
// if servUuid is specified (!undefined) further check if the characteristic belongs to the service is done
// Note: I am not sure if there is a case where the same characteristic belongs to multiple services in a node.
function findCharacteristic(con, charaUuid, optServUuid) { // servUuid is optional; returns noble characteristic
    for (let i = 0; i < con.characteristics.length; i++) {
        let chara = con.characteristics[i];
        if (!vutil.compare(chara.uuid, charaUuid)) continue;
        if (optServUuid && !vutil.compare(chara._serviceUuid, optServUuid)) continue; // limited by service
        return chara;
    }
    console.log("findCharacteristic: " + charaUuid + ": not found");
    return null;
}

// read a characteristic value, convert to a string and pass it through callback 'cb'
module.exports.readCharacteristic = function(address, servUuid, charaUuid, apicb) {
    getConnection(address, (err, con) => {
        if (err) { apicb(err.toString()); return; }
        let chara = findCharacteristic(con, charaUuid, servUuid);
        if (!chara) { apicb(`${servUuid}.${charaUuid}: not found`); return; }
        chara.read((error, data) => {
            if (error) { apicb(error.toString()); return; }
            let str = vutil.fromBuffer(data);
            apicb(str);
        });
    });
}

// write a caracteristic value; value must be hex string, tilda-prefixed string or dotted integer
// callback 'apicb' used to pass error or 'OK' when successful
// noAck is for write-without-response otherwise reliable write
// Note that no error returned when noble writes to nRF51 dongle even if the characteristic is read-only
module.exports.writeCharacteristic = function(address, servUuid, charaUuid, value, noAck, apicb) {
    getConnection(address, (err, con) => {
        if (err) { apicb(err.toString()); return; }
        let chara = findCharacteristic(con, charaUuid, servUuid);
        if (!chara) { apicb(`${servUuid}.${charaUuid} not found`); return; }
        let data = vutil.toBuffer(value);
        console.log("writeCharacteristic: " + JSON.stringify(data));
        chara.write(data, noAck, (error) => {
            if (error) { apicb(error.toString()); return; }
            apicb("OK");
        });
    });
}

// subscribe for indication or notification
// With noble, 'indicate/notify' is ignored; noble api does not provide such selection probably because
// noble automatically selects an available one (I haven't checked it).
// TODO: politely unsubscribe on disconnection and tell that fact to user?
module.exports.subscribe = function(address, servUuid, charaUuid, apicb) {
    getConnection(address, (err, con) => {
        if (err) { apicb(err); return; }
        let chara = findCharacteristic(con, charaUuid, servUuid);
        if (!chara) { apicb(`${servUuid}.${charaUuid}: not found`); return; }
        chara.subscribe((err) => {
            if (err) { apicb(err); return; }
            chara.on('data', (data) => { // second arg, isNotification, is deprecated
                console.log("onData: " + charaUuid + " '" + JSON.stringify(data) + "'");
                let str = vutil.fromBuffer(data);
                apicb(null, str);
            });
        });
    });
}

// list of nodes
// if 'connectable' is true, only connectable nodes are turned; otherwise all nodes are returned
module.exports.getNodes = function(connectable, apicb) {
    // all or only connectable list
    let periphs = connectable ? peripherals.filter(p => p.connectable) : peripherals;

    let nodes = [];
    for (let i = 0; i < periphs.length; i++) {
        let p = periphs[i];
        nodes.push(toNode(p));
    }
    apicb(nodes);
}

// single node
module.exports.getNode = function(address, apicb) {
    let p = peripherals.find(p => vutil.compare(p.address, address));
    apicb(p !== undefined ? toNode(p) : {});
}

// build single json'able 'node' from noble 'peripheral'
function toNode(peripheral) {
    // [noble/lib/peripheral.js]
    // function Peripheral(noble, id, address, addressType, connectable, advertisement, rssi) {
    //     this._noble = noble;
    //     this.id = id;
    //     this.uuid = id; // for legacy
    //     this.address = address;
    //     this.addressType = addressType;
    //     this.connectable = connectable;
    //     this.advertisement = advertisement;
    //     this.rssi = rssi;
    //     this.services = null;
    //     this.state = 'disconnected';
    //   }
    let json = {
        // id: peripheral.id,
        address: peripheral.address,
        addressType: peripheral.addressType,
        connectable: peripheral.connectable,
        localName: peripheral.advertisement.localName,
        serviceUuids: peripheral.advertisement.serviceUuids,
        // serviceSolicitationUuid: peripheral.advertisement.serviceSolicitationUuid,
        // manufacturerData: peripheral.advertisement.manufacturerData // may be undefined
        // txPowerLevel: peripheral.advertisement.txPowerLevel,
        rssi: peripheral.rssi
    };
    if (peripheral.advertisement.manufacturerData) json.manufacturerData = peripheral.advertisement.manufacturerData.toString('hex');
    return json;
    // TODO: looks like AD data array not returned from noble ... what to do with this?
}

// list of services in a node
// In BLE, service uuids are sometimes available through advertisement (or scan response) data before connection.
// But it may not always be filled in.
// For sure, a list of services (and characteristics) must be obtained while a connection is made.
module.exports.getServices = function (address, apicb) {
    // Of the two ways to get a list of services:
    // 1) make a connection and then get them:
    getConnection(address, (err, con) => {
        if (err) { apicb(err.toString()); return; }
        apicb(con.services.map(s => toService(s)));
    });
    // 2) look at advertise (or scan response) data available prior to connection
    // let peripheral = peripherals.find(p => vutil.compare(p.address, address));
    // let services = peripheral ? peripheral.advertisement.serviceUuids : [];
    // return services.map(s => { return { uuid: s }; });
}

// build json'able service data from noble 'service'
function toService(service) {
    return { uuid: service.uuid };
    // TODO: only uuid returned; name and type may be useful
}

// list of characteristics in a service in a node
module.exports.getCharacteristics = function(address, serviceUuid, apicb) {
    getConnection(address, (err, con) => {
        if (err) { apicb(err.toString()); return; }
        let charas = con.characteristics.filter(c => vutil.compare(c._serviceUuid, serviceUuid)); // TODO: c._serviceUuid doesn't exist?
        apicb(charas.map(c => toChara(c)));
    });
}

// build json'able characteristic data from noble 'characteristic'
function toChara(characteristic) {
    return { uuid: characteristic.uuid, properties: characteristic.properties };
    // TODO: name and type are sometimes useful
}
