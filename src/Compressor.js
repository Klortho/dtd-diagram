// Utility to compress state strings, which are very sparse binary strings

if (typeof DtdDiagram == "undefined") DtdDiagram = {};

(function() {
  var debug = false;
  var dbg = debug && (typeof window != "undefined") && window.console ? 
    console.log.bind(window.console) : function() {};

  var b64_digits = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                   "abcdefghijklmnopqrstuvwxyz" +
                   "0123456789-.";


  var c = DtdDiagram.Compressor = {

    // ✓
    compress: function(binstr) {
      dbg("compressing original string: " + binstr);
      var rllc = c.rll_compress(binstr);
      dbg("rll_compressed: " + rllc);
      var b64 = c.binstr_to_base64(rllc);
      dbg("base64: " + b64);
      dbg("compression ratio: " + (binstr.length / b64.length))
      return b64;
    },

    // ✓
    // Convert a string of "0"s and "1"s to a base64 string
    binstr_to_base64: function(binstr) {
      var b = c.cap(binstr),
          len = b.length,
          b64 = "";
      for (var i = 0; i < len; i += 6) {
        var digit = parseInt(b.substr(i, 6), 2);
        b64 += b64_digits.charAt(digit);
      }
      return b64;
    },

    // ✓
    // Add a trailing "1", and pad, such that number of binary digits
    // is divisible by 6.
    cap: function(binstr) { 
      var cp = binstr + "1" + "0".repeat(5 - binstr.length % 6); 
      dbg("capped: " + cp);
      return cp;
    },

    // ✓
    // Convert an integer to a binary string, padding with zeros to n
    // digits
    int_to_binary: function(i, n) {
      var b = i.toString(2);
      return "0".repeat(n - b.length) + b;
    },

    // ✓
    // Do the run-length compression, returning another binary string
    rll_compress: function(s) {
      var i = s.indexOf("1");
      var rllc = (
        i == -1 ? "" :
        (
          i == 0  ? "00" :
          i <= 4  ? "01" + c.int_to_binary(i-1, 2) :
          i <= 20 ? "10" + c.int_to_binary(i-5, 4) :
                    "11" + c.int_to_binary(i-21, 10)
        ) + c.rll_compress(s.substr(i+1))
      );
      return rllc;
    },

  /////////////////////////////////////////////////////////////////////

    decompress: function(b64str) {
      dbg("decompressing: " + b64str);
      var rllc = c.base64_to_binstr(b64str);
      dbg("rll_compressed: " + rllc);
      var binstr = c.rll_decompress(rllc);
      dbg("final binary string: " + binstr);
      return binstr;
    },

    base64_to_binstr: function(b64) {
      var capped = b64.split('').reduce(function(prev, d) {
        var ds = b64_digits.indexOf(d).toString(2);
        ds = "0".repeat(6 - ds.length) + ds;
        return prev + ds;          
      }, "");
      dbg("  capped: " + capped);
      // Uncap:
      var uncapped = capped.substr(0, capped.lastIndexOf("1"))
      dbg("  uncapped: " + uncapped);
      return uncapped;
    },

    rll_decompress: function(rllc) {
      var b = "";
      while (rllc.length > 0) {
        var num_zeros;
        var prefix = rllc.substr(0, 2);
        if (prefix == "00") {
          num_zeros = 0;
          rllc = rllc.substr(2);
        }
        else if (prefix == "01") {
          num_zeros = parseInt(rllc.substr(2, 2), 2) + 1;
          rllc = rllc.substr(4);
        }
        else if (prefix == "10") {
          num_zeros = parseInt(rllc.substr(2, 4), 2) + 5;
          rllc = rllc.substr(6);
        }
        else {
          num_zeros = parseInt(rllc.substr(2, 10), 2) + 21;
          rllc = rllc.substr(12);
        }
        b += "0".repeat(num_zeros) + "1";
      }
      return b;
    },
  };






  if (typeof module != "undefined") module.exports = c;

})();
