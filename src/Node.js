// DtdDiagram.Node class

if (typeof DtdDiagram != "undefined") {
  DtdDiagram.Node = function() {

    // Construct a Node from a specification within a content section
    // of some element within the DTD. Always call this form of the constructor,
    // and it will use the type registry to call the subclass constructors.
    // The default constructor copies *name*, *type*, and *q*, but not *children*.
    var Node = function(diagram, spec, elem_parent) {
      this.diagram = diagram;
      this.elem_parent = elem_parent;
      this.children = [];
      for (var k in spec) {
        if (k != "children") {
          this[k] = spec[k];
        }
      }
    };

    // Here's a registry of subclass constructors, and the Node factory
    Node.subclasses = {};
    Node.factory = function(diagram, spec, elem_parent) {
      if (!spec.type) {
        console.error("Invalid DTD, every node specifier must have a type");
        return null;
      }
      var subclass = Node.subclasses[spec.type];
      if (!subclass) {
        console.error("Invalid DTD, node type not recognized: " + spec.type);
        return null;
      }
      return new subclass(diagram, spec, elem_parent);
    };


    ////////////////////////////////////////////////
    // Some default object methods

    Node.prototype.has_content = function() {
      return false;
    };

    Node.prototype.has_attributes = function() {
      return false;
    };

    Node.prototype.has_q = function() {
      return false;
    };

    Node.prototype.get_content = function() {
      return [];
    };

    // Get all the element descendants of this node
    Node.prototype.elem_descendants = function() {
      var d = [];
      this.get_content().forEach(function(k) {
        if (k.type == "element") {
          d.push(k);
        }
        else if (k.type == "choice" || k.type == "seq") {
          jQuery.merge(d, k.elem_descendants());
        }
      });
      return d;
    };


    // Geometry / layout related
    // -------------------------

    Node.prototype.extents = function() {
      var diagram = this.diagram;
      return new DtdDiagram.Box(
        this.x - diagram.node_box_height / 2,
        this.y,
        this.x + diagram.node_box_height / 2,
        this.y + this.width()
      );
    };

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

    // Determine the extents of a (sub)tree, returning a Box object.
    Node.prototype.tree_extents = function() {
      return (this.children || [])
        .reduce(_tree_reduce, this.extents());
    };


    // D3/SVG drawing
    // --------------

    // Start the update, which means binding the data - the list of Node
    // objects in the tree bound to their `g.node` SVG elements;
    // then creating update, enter, and exit selections and storing 
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
            transform: function(d) { 
              return "translate(" + src_node.y0 + "," + src_node.x0 + ") " +
                     "scale(0.001, 0.001)"; 
            },
          })
        ;

      // For entering Nodes, initialize gs, which is the D3 selection for
      // the <g> container element
      nodes_enter.each(function(d) {
        d.gs = d3.select(this);
      });

      diagram.nodes_exit = nodes_update.exit();
    };


    // Get a Node's y_size, which is used by the layout engine. This is really
    // it's total width (the d3.flextree layout uses x for vertical and y for
    // horizontal).
    Node.prototype.y_size = function() {
      return this.width() + this.diagram.diagonal_width;
    };


    // Transition *all* nodes to their new positions and full-sized scale
    Node.prototype.transition_update = function() {
      var self = this;
      self.gs.transition()
        .duration(self.diagram.duration)
        .attr("transform", 
          "translate(" + self.y + "," + self.x + ") " +
          "scale(1, 1)"
        )
      ;
      return null;
    };

    // Transition exiting nodes to their parents' positions and zero size,
    // then remove them.
    Node.prototype.transition_exit = function() {
      var self = this
          src_node = self.diagram.src_node;

      self.gs.transition()
        .duration(self.diagram.duration)
        .attr("transform", function(d) { 
          return "translate(" + src_node.y + "," + src_node.x + ") " +
                 "scale(0.001, 0.001)"; 
        })
        .remove();

      return null;
    };

    return Node;
  }();
}

