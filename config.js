// configuration
// WEB_*     - index.js
// API_*     - api-impl.js
// BLE_*     - ble-impl general
// BLE_XXX_* - ble-impl-xxx.js specific
module.exports = {
    // server port
    WEB_PORT: 3000,
    // URL prefix
    WEB_PREFIX: "/altapi",
    // ble implementation: XXXX in ble-impl-XXXX.js used
    BLE_IMPL: "noble",
    // connection will be kept this time even if no activity
    BLE_KEEP_INTERVAL: 3 * 60 * 1000,
    // auto-disconnect check interval
    BLE_CHECK_INTERVAL: 60 * 1000,
    // noble passes every advertise data even if source device is the same
    BLE_NOBLE_ALLOW_DUPLICATES: false
}
