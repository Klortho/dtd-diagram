
* diagram.update() shouldn't take an argument. Instead, the caller should first
  set src_node
* Need to implement DtdDiagram.set_src_node()
* get rid of the _width cache on nodes -- it will simplify things, and it is 
  unnecessary, since we already have the diagram.label_width_cache
* use WindowBase64 functions for base64 encoding/decoding
* For compression, use elias gamma encoding, using Uint[8|16|32]Arrays; see
  http://jsperf.com/elias-gamma-encode
* Need to set embiggenning for rebase events

* At the end:
    * figure out how to make url handling pluggable, with function setters



