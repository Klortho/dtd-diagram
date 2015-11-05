
* diagram.update() shouldn't take an argument. Instead, the caller should first
  set src_node
* Need to implement DtdDiagram.set_src_node()
* get rid of the _width cache on nodes -- it will simplify things, and it is 
  unnecessary, since we already have the diagram.label_width_cache

* Need to set embiggenning for rebase events

* At the end:
    * figure out how to make url handling pluggable, with function setters



