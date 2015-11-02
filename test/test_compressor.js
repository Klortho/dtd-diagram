var assert = require('assert');
require('string.prototype.repeat');

var c = require("../src/Compressor.js");

// Function to generate a random string of 0s and 1s, with
// the probability of 0 being p0.
function gen_random_binstr(p0, len) {
  if (typeof p0 == "undefined") p0 = 0.95;
  if (typeof len == "undefined") len = 100;
  return Array.apply(0, Array(len)).reduce(function(prev, n) {
    return prev + (Math.random() < p0 ? "0" : "1")
  }, "");
}


describe('Compressor', function() {

  // Test compress and its helpers

  describe('compress', function() {
    it('should work', function() {
      assert.equal(c.compress("110000000001000000001100000000000"), "CSMg");
    });
    it('shouldn\'t matter how many trailing zeros', function() {
      assert.equal(c.compress("0100010"), c.compress("0100010000000"));
    });
  });

  describe('binstr_to_base64', function() {
    it('should work', function() {
      assert.equal(c.binstr_to_base64("0"), "Q");
      assert.equal(c.binstr_to_base64("00"), "I");
      assert.equal(c.binstr_to_base64("001010001"), "KM");
    });
  });

  describe('cap', function() {
    it('should work', function() {
      assert.equal(c.cap("0000"), "000010");
      assert.equal(c.cap("00000"), "000001");
      assert.equal(c.cap("000000"), "000000100000");
      assert.equal(c.cap("000010010010001100"),
        "000010010010001100100000");
    });
  });

  describe('int_to_binary', function() {
    it('should work', function() {
      assert.equal(c.int_to_binary(4, 6), "000100");
      assert.equal(c.int_to_binary(31, 8), "00011111");
    });
  });

  describe('rll_compress', function () {
    it('should work', function () {
      assert.equal(c.rll_compress("1"), "00");
      assert.equal(c.rll_compress("11"), "0000");
      assert.equal(c.rll_compress("101001"), "0001000101");
    });
  });

  // decompress and its helpers

  describe('decompress', function() {
    it("should work", function() {
      assert.equal(c.decompress("igwQwQg"), 
        "000000010000010000000000000000000000000000000000000100000000" +
        "000000000000000000000000000001");
    });
  });

  describe('base64_to_binstr', function() {
    it('should work', function() {
      assert.equal(c.base64_to_binstr("B"), "00000");
      assert.equal(c.base64_to_binstr("Zombo"), "01100110100010011001101110");
    });
  });

  describe('rll_decompress', function() {
    it('should work', function() {
      assert.equal(c.rll_decompress("100010100000110000010000110000010000"),
        "0000000100000100000000000000000000000000000000000001000000000000" +
        "00000000000000000000000001");
    });
  });

  // functional tests
  describe('compress-round-trip', function() {
    it('string -> compress -> decompress should return original string, ' +
       'minus trailing zeros', function() {
      for (var i = 0; i < 10; ++i) {
        var orig_string = gen_random_binstr();
        var new_string = c.decompress(c.compress(orig_string));
        assert.equal(new_string, 
          orig_string.substr(0, orig_string.lastIndexOf("1") + 1));
      }
    });
  });


});