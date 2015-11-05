* [c] Change the global DtdDiagram.diagrams into an object
* [c] Distinguish between root_node types: orig vs. current

* diagram.update() shouldn't take an argument. Instead, the caller should first
  set src_node

* Need to implement DtdDiagram.set_src_node()

* [c] Don't need last_id; change the way nodes are id'ed:
    * Add `id` to the Node factory function.


* At the end:
    * figure out how to make url handling pluggable, with function setters



# diagram object properties:

Immutable:

* constructor_opts
* container_id - same as the key used in DtdDiagram.diagrams
* orig_root_name 
* orig_root_node

Mutable:

* current_root_addr - for now, a comma-delimited string of ints
* current_root_node
* ec_state
* src_node_addr - relative to the current_root!!
* src_node

