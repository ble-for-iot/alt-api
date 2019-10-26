# ble-for-iot/alt-api - Reference Implementation of Alternative BLE IoT Gateway API

A BLE IoT gateway (ble-iot-gwy) provides web access to nearby Bluetooth Low Energy (BLE) devices via the local LAN or remote BLE devices via Internet.

See API document, [ALT API](http://www.kobu.com/ble-for-iot/alt-api.html), for what web interface the gateway accepts.

This implementation runs on [nodejs](https://nodejs.org/en/) and uses the [express](http://expressjs.com/) module for building a web server, and the [noble](https://github.com/noble/noble) module for accessing a BLE device.

This is one of several implementations of ble-iot-gwy:

| Impl        | Status    | API | Platform           | Tested under |
|:------------|:----------|:----|:-------------------|:-------------|
| sig-api     | published | sig | nodejs/noble       | Windows 10 |
| **alt-api** | published | alt | nodejs/noble       | Windows 10 |
| raspi       | working   | alt | nodejs/dbus-native on linux/bluez | Raspberry Pi |
| esp32       | working   | alt | Espressif ESP32 WiFi/BLE combo chip | - |

Convention: 'Platform' means a collection of software (or hardware) needed to run the gateway software.

## Supported API

This is an implementation of an alternative API, as opposed to the Bluetooth SIG-proposed, [GATT REST API](https://www.bluetooth.com/bluetooth-resources/gatt-rest-api/), shown in another project, **sig-api**, in this repository.

The [ALT API](http://www.kobu.com/ble-for-iot/alt-api.html) provides a web interface that maps web-friendly abstract data access to a BLE-specific device access.

## Implementation

This implementation is tested under:

- DELL PC with Windows 10
- CSR Bluetooth 4.0 dongle (as a central)
- Nordic Semiconductor nRF51 dongle with nRF Connect (as a peripheral)

Dependencies are:

- [nodejs](https://nodejs.org/en/)
- [express](https://expressjs.com/)
- [noble](https://github.com/noble/noble)

**index.js** uses the express module to accept web requests and dispatches API service functions in **api-impl.js**. The functions in api-impl.js further calls ble device access functions in **ble-impl-noble.js**, an implementation using the noble module.

See **ev** folder for screen shots taken when running the gateway.
The tested URLs are slightly different from the final ones.

----

Written: 2019-Oct-10  
Last updated: 2019-Oct-19
