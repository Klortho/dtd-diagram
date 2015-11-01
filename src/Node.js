// DtdDiagram.Node class

(function() {

  var Node = DtdDiagram.Node = {
    // Some constants used in drawing
    node_height: 32,
    node_box_height: 25,
    diagonal_width: 20,
    node_text_margin: 10,
  };

  // Registry of subclass constructors
  var subclasses = {};
  Node.register = function(type, cls) {
    subclasses[type] = cls;
  }

  // The factory constructs a Node from a specification within a content section
  // of some element within the DTD. This uses the type registry to call the 
  // subclass constructors.

  Node.factory = function(diagram, spec, elem_parent) {
    if (!spec.type) {
      console.error("Invalid DTD, every node specifier must have a type");
      return null;
    }
    var subclass = subclasses[spec.type];
    if (!subclass) {
      console.error("Invalid DTD, node type not recognized: " + spec.type);
      return null;
    }

    var n = new subclass();

    // Copy *name*, *type*, and *q*, but not *children*.
    n.diagram = diagram;
    n.spec = spec;
    n.elem_parent = elem_parent;
    n.children = [];
    for (var k in spec) {
      if (k != "children") {
        n[k] = spec[k];
      }
    }

    n.initialize();
    return n;
  };

  // Some functions to help draw SVG paths
  Node.path = function() {
    var p = "";
    for (var i = 0; i < arguments.length; ++i) {
      p += arguments[i] + " ";
    }
    return p;
  }
  // lineto by distance and angle
  Node.la = function(d, a) {
    return "l " + (d * Math.cos(a)) + "," + (d * Math.sin(a)) + " ";
  };
  // circular arc, always drawn clockwise
  Node.arc = function(r, x, y, large_arc) {
    if (typeof large_arc == "undefined") large_arc = 0;
    return "a " + r + "," + r + " 0," + large_arc + ",1 " + x + "," + y + " ";
  };

  // Start the update, after the user has clicked on a button. First thing is
  // to bind the data - the list of Node
  // objects in the tree bound to their `g.node` SVG elements;
  // then create update, enter, and exit selections and store
  // those in diagram.
  Node.start_update = function(diagram, nodes) {
    var src_node = diagram.src_node;

    var nodes_update = diagram.nodes_update = 
      diagram.svg_g.selectAll("g.node")
        .data(nodes, function(d) { 
          return d.id || (d.id = ++diagram.last_id); 
        })
      ;

    // The x,y location <g> of entering nodes all start the animation
    // at the src_node
    var nodes_enter = diagram.nodes_enter = 
      nodes_update.enter().append("g")
        .attr({
          "class": function(d) {
            return "node " + d.type;
          },
          filter: "url(#dropshadow)",
          transform: "translate(" + src_node.y0 + "," + src_node.x0 + ") " +
                     "scale(0.001, 0.001)",
        })
      ;

    // For entering Nodes, initialize gs, which is the D3 selection for
    // the <g> container element
    nodes_enter.each(function(d) {
      d.gs = d3.select(this);
    });

    diagram.nodes_exit = nodes_update.exit();
  };


  // Some private utility functions

  function merge_array(target, source) {
    for (var i = 0; i < source.length; ++i) 
      target.push(source[i]);
  }

  // Tree-reduce function: returns the min/max extents
  // of an accumulator (previous extents), a given node (n) and all
  // of that node's kids.
  function _tree_reduce(acc, n) {
    //acc.log("_tree_reduce:acc");
    var ke = (n.children || [])   // kids extents
      .reduce(_tree_reduce, acc);  
    var ne = n.extents();

    return new DtdDiagram.Box(
      d3.min([ke.top,    ne.top]),
      d3.min([ke.left,   ne.left]),
      d3.max([ke.bottom, ne.bottom]),
      d3.max([ke.right,  ne.right])
    );
  }

  ////////////////////////////////////////////////
  // Object methods

  Node.methods = {

    initialize: function() {},

    has_content: function() {
      return false;
    },

    has_attributes: function() {
      return false;
    },

    has_q: function() {
      return false;
    },

    q_width: function() {
      return 0;
    },

    get_content: function() {
      return [];
    },

    // Get all the element descendants of this node
    elem_descendants: function() {
      var d = [];
      this.get_content().forEach(function(k) {
        if (k.type == "element") {
          d.push(k);
        }
        else if (k.type == "choice" || k.type == "seq") {
          merge_array(d, k.elem_descendants());
        }
      });
      return d;
    },

    // Geometry / layout related
    // -------------------------

    extents: function() {
      var diagram = this.diagram;
      return new DtdDiagram.Box(
        this.x - Node.node_box_height / 2,
        this.y,
        this.x + Node.node_box_height / 2,
        this.y + this.width()
      );
    },

    // Determine the extents of a (sub)tree, returning a Box object.
    tree_extents: function() {
      return (this.children || [])
        .reduce(_tree_reduce, this.extents());
    },

    // D3/SVG drawing
    // --------------

    // Get a Node's y_size, which is used by the layout engine. This is really
    // it's total width (the d3.flextree layout uses x for vertical and y for
    // horizontal).
    y_size: function() {
      return this.width() + Node.diagonal_width;
    },

    // Cache node widths. The actual values are computed in subclass methods
    // compute_width().
    width: function() {
      if (!("_width" in this)) {
        this._width = this.compute_width();
      }
      return this._width;
    },

    // Transition an (updating or entering) node to its new position and 
    // full-sized scale
    transition_update: function() {
      var self = this;
      return DtdDiagram.transition_promise(
        self.gs.transition()
          .duration(self.diagram.duration)
          .attr("transform", 
            "translate(" + self.y + "," + self.x + ") " +
            "scale(1, 1)"
          )
      );
    },

    // Transition exiting nodes to their parents' positions and zero size,
    // then remove them.
    transition_exit: function() {
      var self = this
          src_node = self.diagram.src_node;

      return DtdDiagram.transition_promise(
        self.gs.transition()
          .duration(self.diagram.duration)
          .attr("transform", function(d) { 
            return "translate(" + src_node.y + "," + src_node.x + ") " +
                   "scale(0.001, 0.001)"; 
          })
          .remove()
      );
    },
  };

})();
