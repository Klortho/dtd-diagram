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


    ////////////////////////////////////////////////
    // Geometry / layout related

    Node.prototype.extents = function() {
      var diagram = this.diagram;
      return new DtdDiagram.Box(
        this.x - diagram.node_box_height / 2,
        this.y,
        this.x + diagram.node_box_height / 2,
        this.y + diagram.node_width
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

    ////////////////////////////////////////////////
    // SVG drawing

    // Draw the initial state of the node, at the begining of the animation
    // FIXME: this default impl will go away, once it's done for all subclasses
    Node.prototype.draw_enter = function(g) {
      console.log("Node.draw_enter: d = %o, g = %o", this, g);
    };

    // Draw an entering node box (zero-width) and its label. 
    // This is shared by ElementNodes and SimpleNodes.
    Node.prototype.draw_enter_box = function(g) {
      var self = this,
          diagram = self.diagram,
          node_box_height = diagram.node_box_height;

      var gs = self.gs = d3.select(g);

      // draw the box
      gs.append("rect")
        .attr({
          "data-id": self.id,
          "class": self.type + "-box",
          width: 0,
          height: node_box_height,
          y: - node_box_height / 2,
          rx: 6,
          ry: 6,
        })
      ;

      // draw the text
      gs.append("a")
        // FIXME: need to use URL templates
        .attr("xlink:href", diagram.tag_doc_url + "elem-" + self.name)
        .append("text")
          .attr({
            id: self.id,
            "class": "label",
            x: 0,
            y: 0,
            "text-anchor": "baseline",
            "alignment-baseline": "middle",
          })
          .text(self.name)
          .style("fill-opacity", 0)
      ;
    };

    Node.prototype.transition_enter = function(g) {
      console.log("Node.transition_enter");
      return null;
    };

    // Transition an entering node box and its label to their
    // final, displayed values.
    // This is shared by ElementNodes and SimpleNodes.
    Node.prototype.transition_enter_box = function() {
      var self = this,
          gs = self.gs,
          box_class = self.type + "-box",
          diagram = self.diagram,
          duration = diagram.duration;

      console.log("transition_enter_box: box_class = " + box_class);
      gs.select('.' + box_class).transition()
        .duration(duration)
        .attr("width", function(d) { return d.width; })
      ;
    };

    return Node;
  }();
}

