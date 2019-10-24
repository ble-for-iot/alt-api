/**
 * value.js - utility functions for handling a request or response value
 * basically, it does conversion between a text string on web and a binary byte string on ble.
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

// 19-oct-12 written, unit-tested
// 19-oct-13 web-tested
// 10-oct-14 compare()

// convert an integer to Buffer of 'len' bytes
// assume 'len' already checked; it must be 1, 2 or 4.
function integerToBuffer(len, num) {
    let buf = Buffer.alloc(len);
    if (len === 1) {
        if (num > 0) buf.writeUInt8(num); // unsinged - up to 255
        else buf.writeInt8(num); // signed
    }
    else if (len === 2) {
        if (num > 0) buf.writeUInt16LE(num); // unsigned - full 16-bit used
        else buf.writeInt16LE(num); // signed
    }
    else if (len === 4) {
        if (num > 0) buf.writeUInt32LE(num); // unsigned - full 32-bit used
        else buf.writeInt32LE(num); // signed
    }
    return buf;
}

// [web-to-ble] convert string value received from a web client to Buffer data given to characteristic.write()
// three formats are allowed:
// - hex characters: length auto-calculated and determines data size; eg. "0100" = two-byte value of 1 in little endian
// - string data prefixed with tilda '~': "~hello" -> five character string of 'hello'
// - decimal integer value of one, two or four bytes using dots (.) as separators as in '.length.integer' converted to
//   little endian format:
//     ".1.1" = [ 0x01 ], ".1.-1" = [ 0xff ], ".1.255" = [ 0xff ],
//     ".2.1" = [ 0x01, 0x00 ], ".4.1" = [ 0x01, 0x00, 0x00, 0x00]
//   you can specify either a positive, negative or unsigned value withing the range.
module.exports.toBuffer = function(str) {
    if (!str || str.length == 0) return null;
    if (str.charAt(0) === '~') { // tilda (~) + ascii string
        if (/^~[\x20-\x7F]+$/.test(str)) {
            let buf = Buffer.alloc(str.length - 1);
            buf.write(str.substring(1));
            return buf;
        }
        else {
            console.log("toBuffer: invalid string: " + str);
            return null;
        }
    }
    if (str.charAt(0) === '.') { // dot (.) + length + dot + [-]integer
        if (/^\.[124]\.-?[0-9]+$/.test(str)) {
            let len = str.charAt(1) - '0';
            let num = parseInt(str.substring(3));
            return integerToBuffer(len, num);
        }
        else {
            console.log("toBuffer: invalid integer: " + str);
            return null;
        }
    }
    if (str.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(str)) { // hex string
        return Buffer.from(str, 'hex'); // hex
    }
    else {
        console.log("toBuffer: invalid hex string: " + str);
        return null;
    }
}

// return integer read from a Buffer of 'len' bytes
// 'len' should be 1, 2 or 4.
// Note: 'len' is redundant and it is data.length
function bufferToInteger(len, data) {
    if (len === 1) return data.readUInt8(); // unsigned
    else if (len === 2) return data.readInt16LE(); // signed; 
    else if (len === 4)return data.readInt32LE(); // signed
    else return null;
}

// [ble-to-web] convert Buffer data from characteristic.read() to value object sent to a web client
// format: { len: *length*, hex: *hex*, [num: *integer*,] [str: *string*] }
// - A response byte string is returned as a hex string in 'hex' field; 'len' fields is the length of the byte string.
//   { hex: "ab00cd", len: 3 }
// - if all bytes in the byte string are printable ASCII characters, the 'str' field is present and the value is the string.
//   { hex: "414243", len: 3, str: "ABC" }
// - if the 'length' of the byte string is one, two or four, 'num' field is present and the value is an integer converted
//   as an littel endian format. A byte value is treated as unsigned while two-byte and four-byte integer is treated as signed.
//   { hex: "01000000", len: 4, num: 1 }
//   { hex: "40414243", len: 4, num: 1128415552, str: "@ABC" } - also treated as a string
module.exports.fromBuffer = function(data) {
    let len = data.length;
    let hex = data.toString('hex');
    let str = data.toString();
    if (!/^~[\x20-\x7F]+$/.test(str)) str = undefined; 
    let num = bufferToInteger(len, data);
    let obj = { hex: hex, len: len };
    if (str) obj.str = str;
    if (num) obj.num = num;
    return obj;
}

// returns a comparable string for an bluetooth address or uuid
// to do that,
//  - remove '-' and ':'
//  - make lower case
// examples:
//  'c0:ab:2a:6a:1a:89' -> 'c0ab2a6a1a89'
//  '550e8400-e29b-41d4-a716-446655440000' -> '550e8400e29b41d4a716446655440000'
// Note: colon (:) is a reserved character in url encoding and better be passed without when passed from a web client
function toComparable(str) {
    return str.replace(/[-:]/g,"").toLowerCase();
}

// compare two strings case-insensitively ignoring separators colons or hyphens 
module.exports.compare = function(a, b) {
	return toComparable(a) === toComparable(b);
}
