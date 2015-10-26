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
    // D3/SVG drawing

    // Start the update, which means binding the data - the list of Node
    // objects in the tree bound to their `g.node` SVG elements;
    // then creating update, enter, and exit selections and storing 
    // those in diagram.

    Node.start_update = function(diagram) {
      var src_node = diagram.src_node,
          nodes = diagram.nodes;

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
            "class": "node",
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

      var nodes_exit = diagram.nodes_exit = nodes_update.exit();
    };


    // Get the displayed width for a label string. This generates a temporary
    // SVG text node, measures its width, and then destroys it.
    Node.label_width = function(diagram, label) {
      if (!("label_width_cache" in diagram)) {
        diagram.label_width_cache = {};
      }
      var cache = diagram.label_width_cache;
      if (!(label in cache)) {
        var text = diagram.svg_g
          .append("text")
            .attr({
              "id": "temporary-label",
              "class": "label",
              x: 0,
              y: 0,
            })
            .text(label)
            .style("fill-opacity", 0)
        ;
        cache[label] = 
          document.getElementById("temporary-label").getBBox()["width"];
        text.remove();
      }
      return cache[label];
    }


    // Draw the initial state of the node, at the beginning of the animation.
    // This also sets the width and y_size, which sometimes depends on the
    // drawing.
    // FIXME: this default impl will go away, once it's done for all subclasses
    Node.prototype.draw_enter = function() {
      console.log("FIXME: Node.draw_enter: d = %o, g = %o", this, g);
    };

    // Draw an entering node box and its label. 
    // This is shared by ElementNodes and SimpleNodes.
    Node.prototype.draw_enter_box = function() {
      var self = this,
          gs = self.gs,
          diagram = self.diagram,
          node_box_height = diagram.node_box_height;

      // Draw the box. Initially, it has zero width.
      gs.append("rect")
        .attr({
          "data-id": self.id,
          "class": self.type + "-box",
          width: self.width,
          height: node_box_height,
          y: - node_box_height / 2,
          rx: 6,
          ry: 6,
        })
      ;

      // Draw the text. 
      gs.append("a")
        // FIXME: need to use URL templates
        .attr("xlink:href", diagram.tag_doc_url + "elem-" + self.name)
        .append("text")
          .attr({
            id: self.id,
            "class": "label",
            x: diagram.node_text_margin +
               (self.q ? diagram.q_width : 0),
            y: 0,
            "text-anchor": "baseline",
            "alignment-baseline": "middle",
          })
          .text(self.name)
      ;
    };

    // Text label for `q`
    Node.prototype.draw_enter_q = function() {
      var self = this,
          gs = self.gs,
          diagram = self.diagram;
      if (!self.q) return;

      gs.append("text")
        .attr({
          "class": "q",
          x: diagram.node_text_margin,
          y: 0,
          "text-anchor": self.type == "element" ? "start" : "middle",
          "alignment-baseline": "middle",
        })
        .text(self.q)
      ;
    }

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

