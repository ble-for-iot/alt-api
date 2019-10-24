/**
 * ble-iot-gateway on nodejs (alternative api version)
 * provides web access to nearby BLE devices on a local LAN and remote BLE devices through the Internet
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

// 2019-sep-23 experiment with http and url package
// 2019-sep-23 scratch with express routing
// sig-api (noble/win):
// 2019-sep-24 gap/gatt api skeltons 
// 2019-sep-29 api skelton tested 
// 2019-oct-04 replaceable ble-side code: ble-impl.js
// 2019-oct-04 api test code written and tested
// 2019-oct-05 noble version (windows) started
// 2019-oct-09 done
// alt-api:
// 2019-oct-10 api revision started
// 2019-oct-15 done
// 2019-oct-15 tested with sse-test.html
// dbus-native (raspi):
// 2019-oct-16 started
// 2019-oct-18 verb in url begins with colon (:) as google recommends - cancelled

// configuration
const config = require('./config');

// express routing
const express = require('express')
const app = express()

// url handling
const url = require('url');

// inclulde api implementation code
const api = require('./api-impl')
api.init();

// call api-impl side functions
function handle(req, res, func) {
  let reqUrl = url.parse(req.url, true);
  console.log("REQ: " + req.method + " " + reqUrl.pathname + " : " + JSON.stringify(req.params) + " ? " + JSON.stringify(reqUrl.query));
  func(req.params, reqUrl.query, function(json) {
    // res.contentType('application/json');
    res.json(json);
    console.log("RES: " + JSON.stringify(json));
  })
}

// list of nodes (all or connectable)
// sig-api: GET http://<gateway>/gatt/nodes[?enable=1]
// alt-api: GET http://<gateway>/<prefix>/nodes[?connectable=1]
// Information about available nodes or connectable nodes if connectable=1 (enable=1 in sig-api)
// sig-api's 'active=1/passive=1' are not supported.
app.get(config.WEB_PREFIX + '/nodes', (req, res) => {
  handle(req, res, api.getNodes);
})

// info about a single node
// sig-api: GET http://<gateway>/gatt/nodes/<node>
// alt-api: GET http://<gateway>/<prefix>/nodes/<node>
// Read data for a specific node identified by <node>
app.get(config.WEB_PREFIX + '/nodes/:node', (req, res) => {
  handle(req, res, api.getNode);
})

// list of services
// sig-api: GET http://<gateway>/gatt/nodes/<node>/services
// alt-api: GET http://<gateway>/<prefix>/nodes/<node>/services
// Discover all services in the node identified by <node>.
// sig-api's 'primary=1' and 'uuid=<uuid>' are not supported; all primary uuids are returned
app.get(config.WEB_PREFIX + '/nodes/:node/services', (req, res) => {
  handle(req, res, api.getServices);
})

// list of items
// sig-api: GET http://<gateway>/gatt/nodes/<node>/services/<service>/characteristics
// alt-api: GET http://<gateway>/<prefix>/nodes/<node>/services/<service>/items
// Discover all characteristics (items in alt-api) of a service in the node identified by <node>.
app.get(config.WEB_PREFIX + '/nodes/:node/services/:service/items', (req, res) => {
  handle(req, res, api.getItems);
})

// reading of item value
// sig-api: GET http://<gateway>/gatt/nodes/<node>/characteristics/<characteristic>/value
// alt-api: GET http://<gateway>/<prefix>/nodes/<node>/services/<service>/items/<item>/value
// Read the value of an characteristic (item in alt-api) within a service in a node.
//  Please note that alt-api has an extra service parameter while sig-api does not.
//  sig-api's assumption is that no two services has the same characteristic.
//  I chose to request web developers to specify the parent service to avoid a possible ambiguous case.
// see 'Request value format' in the document for what can be passed to <value>
// sig-api's long=1, multiple=1, ... are not supported
app.get(config.WEB_PREFIX + '/nodes/:node/services/:service/items/:item/value', (req, res) => {
  handle(req, res, api.getItemValue);
})

// Use Server Side Events to subscribe to data/status change report
// sig-api: GET http://<gateway>/gatt/nodes/<node>/characteristics/<characteristic>/event
// alt-api: GET http://<gateway>/<prefix>/nodes/<node>/services/<service>/items/<item>/report
// This URI is used to trigger a subscription of indicated or notified values (report) for
// a characteristic (item) in a service in the node identified by <node>.
// Note an extra 'service' parameter in alt-api.
// sig-api's 'indicate=1' and 'notify=1' are not supported.
// The gateway or underlying ble implementation selects either is available.
// see 'Response value format' in the document for what can be returned as data.
app.get(config.WEB_PREFIX + '/nodes/:node/services/:service/items/:item/report', (req, res) => {
  let reqUrl = url.parse(req.url, true);
  console.log("REQ: " + req.method + " " + reqUrl.pathname + " : " + JSON.stringify(req.params) + " ? " + JSON.stringify(reqUrl.query));
  // Simple Way to Implement Server Sent Events in Node.js?
  // https://stackoverflow.com/questions/36249684/simple-way-to-implement-server-sent-events-in-node-js
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  api.setupEventStream(req.params, reqUrl.query, function (err, data) {
    if (err) {
      console.log("report: " + JSON.stringify(err));
      res.end();
    }
    else res.write("data: " + JSON.stringify(data) + "\n\n");
  });
})

// writing of item value
// sig-api: PUT http://<gateway>/gatt/nodes/<node>/characteristics/<characteristic>/value/<value>[?noresponse=1]
// alt-api: PUT http://<gateway>/<prefix>/nodes/<node>/services/<service>/items/<item>/value/<value>[?noresponse=1]
// Write a value <value> to the characteristic (item) in the service in the node identified by <node>.
// Note an extra 'service' parameter in alt-api.
// See 'Response value format' in the document for what can be returned in <value>
// sig-api's long=1 is not supported
app.put(config.WEB_PREFIX + '/nodes/:node/services/:service/items/:item/value/:value', (req, res) => {
  handle(req, res, api.putItemValue);
})

// wakeup gateway 
// GET http://<gateway>/<prefix>/wakeup
app.put(config.WEB_PREFIX + '/wakeup', (req, res) => {
  handle(req, res, api.wakeup);
})

// sleep gateway
// GET http://<gateway>/<prefix>/sleep
app.put(config.WEB_PREFIX + '/sleep', (req, res) => {
  handle(req, res, api.sleep);
})

// device open
// GET http://<gateway>/<prefix>/node/<node>/open
app.put(config.WEB_PREFIX + '/node/:node/open', (req, res) => {
  handle(req, res, api.open);
})

// device close
// GET http://<gateway>/<prefi>/node/<node>/close
app.put(config.WEB_PREFIX + '/node/:node/close', (req, res) => {
  handle(req, res, api.close);
})

///// end of api calls /////

const fs = require('fs');

// redirect to '/test/index.html'
app.get('/test', (req, res) => {
  res.redirect('/test/index.html');
})

// provide test files in './test' folder
app.get('/test/:file', (req, res) => {
  let file = req.params.file;
  console.log(`static file = ${file}`);
  fs.readFile('./test/' + file, 'utf8', (err, data) => {
    if (err) res.end(err.toString());
    res.send(data);
  });
})

// start server
const port = config.WEB_PORT;
app.listen(port, () => console.log(`ble-iot-gwy listening on port ${port}`))
