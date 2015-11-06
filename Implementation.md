Notes on the implementation of dtd-diagram

# Managing geometry

The geometry of the display is captured by several separate Box objects, 
with each box recording top, bottom, left, and right in the SVG
coordinate system.

The variable names for these use one of "drawing", "canvas", or "viewport".
If the name does not have a prefix, it means the *previous*
state, before the click. If it has the prefix "new_", it means the
state after the click. Here they are:

- `new_drawing`: the current extents of the drawing
- `canvas`, `new_canvas`: normally, this is the same as the drawing; but if the 
  drawing is below a minimum canvas size, this will take that minimum size.
- `viewport`, `new_viewport`: same size as the minimum canvas size, but it moves 
  around.


# Data models

The DTD data and the display tree data are held in a separate data structures. 
This is necessary, because a given element might appear in several places in the
DTD, and might be expanded in some places but collapsed in others. Because the
DTD content models can be circular (an \<sc> element can contain another \<sc>
element, for example) it would be impossible to completely expand the DTD tree.

The content model of an element can be quite complex, and is, in general, 
a hierarchy itself (a sub-tree of the main tree).

See for example:

* [&lt;journal-meta>](http://jatspan.org/niso/publishing-1.1d3/#p=nfd-journal-meta) -
  note the sub-sequence starting with contrib-group
* [&lt;name>](http://jatspan.org/niso/publishing-1.1d3/#p=nfd-name) - note
  the sub-hierarchy with surname and given-names

## Globals

* DtdDiagram.diagrams_array - an array of all of the diagrams
* DtdDiagram.diagrams_hash - an object whose keys are the container ids for the
  diagrams

#### In-memory tree

For each diagram, there is an in-memory tree of nodes that has the following
properties:

* The original root node never changes, no matter what the actual displayed 
  root node is at any given time. orig_root = original root; current_root =
  current displayed root
* The "address" of every node never changes, and is used as that node's "id"
  property, to identify it to D3. The address of the original root
  node is [0], and the address of every child of any node is the array formed
  by adding that child's index to its parent's address array.
* Once a node is created in memory, it's never destroyed, even if it's not
  displayed at some given time; unless the whole diagram is destroyed.

The diagram will store:

* A hash object cross referencing the addresses to the nodes. The original
  root can be retrieved from this, with index corresponding to [0]


## The diagram object

Here's a comprehensive reference list of all of the properties of the
diagram object.

* canvas
* constructor_opts - any options passed into the constructor
* container_d3 - D3 selection for the container div
* container_dom - DOM node of the container div
* container_id - @id attribute value of the container div, this is used as a
  unique identifier for this diagram
* current_root_addr - address of the current root node relative to the orig_root_node
* current_root_node - the current root node
* diagonal - function used by D3 to generate diagonals
* dtd_json - the dtd json object
* dtd_json_file - name of the dtd json file
* duration - user option; duration of the animation
* ec_state - current expand/collapse state of the drawing, starting at the current
  root node
* embiggenning - maintained by Canvas, records, during an update event, whether the
  drawing is getting bigger or smaller
* engine - d3-flextree layout enging
* event_handler - user-provided as a callback function for events
* group_separation - ratio of the separation of sibling nodes to nodes that are not
  siblings
* label_width_cache - a cache used when computing the widths of text labels (which
  requires creating a DOM node, and then measuring it)
* min_canvas_height - user option
* min_canvas_width - user option
* new_canvas - maintained by Canvas, used in transitioning the drawing as a whole
* new_drawing - maintained by Canvas, used in transitioning the drawing as a whole
* new_viewport - maintained by Canvas, used in transitioning the drawing as a whole
* nodes - a hash of all nodes ever instantiated; keys are the ids (addresses)
* nodes_enter - during updates, this is the D3 "enter" selection
* nodes_exit - during updates, this is the D3 "exit" selection
* nodes_update - during updates, this is the D3 "update" selection
* orig_root_name - the name of the element that is the root of the in-memory tree;
  this never changes during the life of the diagram.
* orig_root_node - the original root node; never changes
* src_node - during user-initiated update events, this is the node that was clicked.
  The Canvas object will make sure that the drawing is transitioned such that this
  node is in the viewport
* src_node_addr - address of the source node relative to the current root node
* svg - D3 selection for the \<svg> element
* svg_g - D3 selection for the \<g> element child of the \<svg>
* tag_doc_base - user option, used to generate links to the documentation
* tag_doc_url - user-supplied function to generate links to the doc
* viewport - maintained by Canvas, used in transitioning the drawing as a whole


# Managing state

This module maintains/uses these diagram object properties:

* orig_root_name - immutable; fixed when the diagram is initialized
* orig_root_node - also immutable
* current_root_addr - for now, a comma-delimited string of ints
* current_root_node
* ec_state
* src_node_addr - relative to the current_root!!
* src_node

## History state object

The history.state object has all the information needed to recreate (to the
extent necessary) the same in-memory tree of nodes, with the same original
root, current root, and source node. This is necessary because, if the user
clicks the reload button while viewing a diagram, we want them to get back
to the same state. But more than that, we want them to then be able to click
the back and forward buttons, and have the transitions continue to be seamless,
just as though they had never clicked reload.

The history.state object has a key for each diagram, whose value is an object.
For example:

```
{ "dtd-diagram": {
    orig_root_name: "article",     // name of the original root
    current_root_addr:  "0,5,2",   // address of the current root, relative to the 
                                   // original_root
    ec_state: "SaV",               // ec_state, starting at the *current_root*
    src_node_addr: "4,1",          // address of the source node, relative to the 
                                   // *current_root*
  }, ...
}
```

## URL state information

Some, but not all, of the state information is also encoded in the URL.
The URL will be maintained such that, if somebody loads that URL in a pristine
browser, they'll see the same diagrams, in the same expand/collapse states, and
with the same current root node and same src_node. What will not be preserved
are:

* The original root node of the diagram that was active when the URL was
  created.
* The addresses (ids) of the nodes -- these will be based on this new original 
  root node.

So, the query string will look like this example:

    ?d1=article!AF1b!7uI&d2=front!Aix!8i

giving the state data for two diagrams, `d1` and `d2`, *relative to their
current_roots at the time the URL was generated*. For `d1`:

* current_root_name = "article" - the name of the current_root
* ec_state = "AF1b" - expand/collapse state, starting at current_root
* src_node_addr = "7uI" - address of source node relative to current_root.





