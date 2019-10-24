/**
 * test-value.js - unit test for value.js
 */

var value = require("./value");
var assert = require("assert");

function test(title, expected, func, arg) {
    console.log("-- " + title);
    let actual = func(arg);
    let actualJson = JSON.stringify(actual);
    let expectedJson = JSON.stringify(expected);
    console.log(expectedJson + " -> " + actualJson);
    assert.deepEqual(expected, actual);
}

function runTest() {

    // empty request
    test("toBuffer(undefined)", null, value.toBuffer, undefined);
    test("toBuffer(null)", null, value.toBuffer, null);
    test("toBuffer('')", null, value.toBuffer, "");

    // string request
    test("toBuffer('~ascii')", Buffer.from("ascii"), value.toBuffer, "~ascii");

    // string request - invalid
    test("toBuffer(~tab)", null, value.toBuffer, "~\t"); // non-ascii

    // integer request - byte
    test("toBuffer('.1.0')", Buffer.from([ 0 ]), value.toBuffer, ".1.0");
    test("toBuffer('.1.1')", Buffer.from([ 1 ]), value.toBuffer, ".1.1");
    test("toBuffer('.1.127')", Buffer.from([ 0x7f ]), value.toBuffer, ".1.127");
    test("toBuffer('.1.-1')", Buffer.from([ 0xff ]), value.toBuffer, ".1.-1");
    test("toBuffer('.1.-128')", Buffer.from([ 0x80 ]), value.toBuffer, ".1.-128");
    test("toBuffer('.1.255')", Buffer.from([ 0xff ]), value.toBuffer, ".1.255");

    // integer request - 16 bits
    test("toBuffer('.2.0')", Buffer.from([ 0, 0 ]), value.toBuffer, ".2.0");
    test("toBuffer('.2.1')", Buffer.from([ 1, 0 ]), value.toBuffer, ".2.1");
    test("toBuffer('.2.32767')", Buffer.from([ 0xff, 0x7f ]), value.toBuffer, ".2.32767");
    test("toBuffer('.2.-1')", Buffer.from([ 0xff, 0xff ]), value.toBuffer, ".2.-1");
    test("toBuffer('.2.-32768')", Buffer.from([ 0x00, 0x80 ]), value.toBuffer, ".2.-32768");
    test("toBuffer('.2.65535')", Buffer.from([ 0xff, 0xff ]), value.toBuffer, ".2.65535");

    // integer request - 32 bits
    test("toBuffer('.4.0')", Buffer.from([ 0, 0, 0, 0 ]), value.toBuffer, ".4.0");
    test("toBuffer('.4.1')", Buffer.from([ 1, 0, 0, 0 ]), value.toBuffer, ".4.1");
    test("toBuffer('.4.2147483647')", Buffer.from([ 0xff, 0xff, 0xff, 0x7f ]), value.toBuffer, ".4.2147483647");
    test("toBuffer('.4.-1')", Buffer.from([ 0xff, 0xff, 0xff, 0xff ]), value.toBuffer, ".4.-1");
    test("toBuffer('.4.-2147483648')", Buffer.from([ 0x00, 0x00, 0x00, 0x80 ]), value.toBuffer, ".4.-2147483648");
    test("toBuffer('.4.4294967295')", Buffer.from([ 0xff, 0xff, 0xff, 0xff ]), value.toBuffer, ".4.4294967295");
    
    // hex request
    test("toBuffer('01')", Buffer.from([ 1 ]), value.toBuffer, "01");
    test("toBuffer('ab')", Buffer.from([ 0xab ]), value.toBuffer, "ab");
    test("toBuffer('AB')", Buffer.from([ 0xab ]), value.toBuffer, "AB");
    test("toBuffer('0100')", Buffer.from([ 1, 0 ]), value.toBuffer, "0100");
    test("toBuffer('010000')", Buffer.from([ 1, 0, 0 ]), value.toBuffer, "010000");
    test("toBuffer('01000000')", Buffer.from([ 1, 0, 0, 0 ]), value.toBuffer, "01000000");
    test("toBuffer('0100000000')", Buffer.from([ 1, 0, 0, 0, 0 ]), value.toBuffer, "0100000000");

    // hex request - invalid
    test("toBuffer('0')", null, value.toBuffer, "0");
    test("toBuffer('0x')", null, value.toBuffer, "0x");

    // integer response
    test("fromBuffer('01')", { len: 1, hex: "01", num: 1 }, value.fromBuffer, Buffer.from("01", 'hex'));
    test("fromBuffer('ab')", { len: 1, hex: "ab", num: 171 }, value.fromBuffer, Buffer.from("ab", 'hex')); // unsigned
    test("fromBuffer('ff')", { len: 1, hex: "ff", num: 255 }, value.fromBuffer, Buffer.from("ff", 'hex')); // unsigned
    test("fromBuffer('0100')", { len: 2, hex: "0100", num: 1 }, value.fromBuffer, Buffer.from("0100", 'hex'));
    test("fromBuffer('ffff')", { len: 2, hex: "ffff", num: -1 }, value.fromBuffer, Buffer.from("ffff", 'hex'));
    test("fromBuffer('01000000')", { len: 4, hex: "01000000", num: 1 }, value.fromBuffer, Buffer.from("01000000", 'hex'));
    test("fromBuffer('ffffffff')", { len: 4, hex: "ffffffff", num: -1 }, value.fromBuffer, Buffer.from("ffffffff", 'hex'));

    // string response
    test("fromBuffer('A')", { len: 1, hex: "41", num: 65 }, value.fromBuffer, Buffer.from("A"));
    test("fromBuffer('AB')", { len: 2, hex: "4142", num: 16961 }, value.fromBuffer, Buffer.from("AB"));
    test("fromBuffer('ABC')", { len: 3, hex: "414243" }, value.fromBuffer, Buffer.from("ABC"));
    test("fromBuffer('@ABC')", { len: 4, hex: "40414243", num: 1128415552 }, value.fromBuffer, Buffer.from("@ABC"));
    test("fromBuffer('ascii')", { len: 5, hex: "6173636969" }, value.fromBuffer, Buffer.from("ascii"));

    // string response - invalid
    test("fromBuffer('@\t')", { len: 2, hex: "4009", num: 2368 }, value.fromBuffer, Buffer.from("@\t"));

    // hex response - three bytes (not integer), no ascii
    test("fromBuffer('010000')", { len: 3, hex: "010000" }, value.fromBuffer, Buffer.from("010000", 'hex'));
}

runTest();
