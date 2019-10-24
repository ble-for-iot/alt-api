/**
 * api-impl.js - platform-free, framework-free api entry points
 *   that call a specific ble access implementation.
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
 
// 19-oct-04 generic skelton written, tested (sig-api version)
// 19-oct-10 revision to match alt-api started
// 19-oct-15 done
// 19-oct-15 add service parameter to read/write/subscribe characetristic

// configuration
const config = require('./config');

// reference to ble access implemetation
// parameters to ble-impl are: node address, service uuid, characteristic uuid
// var ble = require('./ble-impl-noble');
var ble = require(`./ble-impl-${config.BLE_IMPL}`);

// initialize this and ble-impl code
module.exports.init = function() {
    ble.init();
}

///// query /////

// get a list of devices (all or only connectable)
// GET http://<gateway>/<prefix>/nodes[?connectable=1]
// no params
// Note: sig-api's 'active=1/passive=1' are not supported due to the following reasons:
// - scanning is already started in the alt-api implementation
// - selection of active/passiv scan depends on a ble implementation
// - for a ble implementation which provides selection feature, config parameter can be provided.
module.exports.getNodes = function(params, query, cb) {
    console.log("getNodes: connectable = " + query.connectable);
    let connectable = query.connectable === "1";
    setImmediate( () => {
        ble.getNodes(connectable, cb);
    });
}

// get info about a specific device
// GET http://<gateway>/<prefix>/nodes/<node>
// no query string
// NOTE: This may be deleted if extar node-specific info will not be provided
module.exports.getNode = function(params, query, cb) {
    let address = params.node;
    console.log("getNode: node = " + address);
    setImmediate( () => {
        ble.getNode(address, cb);
    });
}

// get a list of services in a device
// GET http://<gateway>/<prefix>/nodes/<node>/services
// only primary services returned
module.exports.getServices = function(params, query, cb) {
    let address = params.node;
    console.log("getServices: node = " + address);
    setImmediate( () => {
        ble.getServices(address, cb);
    });
}

// get list of characteristics (items) in a service
// GET http://<gateway>/<prefix>/nodes/<node>/services/<service>/items
// no query string
module.exports.getItems = function(params, query, cb) {
    let address = params.node;
    let servUuid = params.service;
    console.log(`getItems: ${address}.${servUuid}`);
    setImmediate( () => {
        ble.getCharacteristics(address, servUuid, cb);
    });
}

///// data /////

// get value of a characteristic (item)
// GET http://<gateway>/<prefix>/nodes/<node>/services/<service>/items/<item>/value
// no query string
module.exports.getItemValue = function(params, query, cb) {
    let address = params.node;
    let servUuid = params.service;
    let charaUuid = params.item;
    console.log(`getItemValue: ${address}.${servUuid}.${charaUuid}`);
    setImmediate( () => {
        ble.readCharacteristic(address, servUuid, charaUuid, cb);
    });
}

// subscribe to indication or notification whichever is available
// GET http://<gateway>/<prefix>/nodes/<node>/services/<service>/items/<item>/report
// CCCD is handled automatically by the gateway or underlying ble implementation, therefore,
// extra sig-api PUT descriptor api not necessary at the user side.
// The gateway or the ble implementation selects either is available.
// It depends the gateway or the ble impleentation which of indication or notification is
// selected when both are available.
module.exports.setupEventStream = function (params, query, cb) {
    let address = params.node;
    let servUuid = params.service;
    let charaUuid = params.item;
    console.log(`setupEventStream: ${address}.${servUuid}.${charaUuid}`);
    setImmediate( () => {
        ble.subscribe(address, servUuid, charaUuid, cb);
    });
}

// write inline data (not body data) to a characteristic (item)
// PUT http://<gateway>/<prefix>/nodes/<node>/services/<service>/items/<item>/value/<value>[?noresponse=1]
module.exports.putItemValue = function(params, query, cb) {
    let address = params.node;
    let servUuid = params.service;
    let charaUuid = params.item;
    let value = params.value;
    let noAck = query.noresponse === "1";
    console.log(`putItemValue: ${address}.${servUuid}.${charaUuid} <= ${value}, noAck = ${noAck}`);
    setImmediate( () => {
        ble.writeCharacteristic(address, servUuid, charaUuid, value, noAck, cb);
    });
}

///// setup /////

// GET http://<gateway>/<prefix>/wakeup
// GET http://<gateway>/<prefix>/sleep
// GET http://<gateway>/<prefix>/node/<node>/open
// GET http://<gateway>/<prefix>/node/<node>/close

// wakeup gateway and start scanning 
module.exports.wakeup = function(params, query, cb) {
    setImmediate( () => {
        ble.wakeup();
    });
}

// sleep gateway after stop scanning
module.exports.sleep = function(params, query, cb) {
    setImmediate( () => {
        ble.sleep();
    });
}

// open device (connect if not already)
module.exports.open = function(params, query, cb) {
    setImmediate( () => {
        ble.open();
    });
}

// close device (mark disconnectable)
module.exports.close = function(params, query, cb) {
    setImmediate( () => {
        ble.close();
    });
}
