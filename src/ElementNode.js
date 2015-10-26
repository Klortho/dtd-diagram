// DtdDiagram.ElementNode class

if (typeof DtdDiagram != "undefined") {
  DtdDiagram.ElementNode = function() {
    var Node = DtdDiagram.Node;

    // Constructor. Don't call this directly; it is called from the Node
    // constructor.
    var ElementNode = function(diagram, spec, elem_parent) {
      var self = this;
      Node.call(self, diagram, spec, elem_parent);
      if (!("q" in self)) self.q = null;

      self.content = null;
      self.content_expanded = false;
      self.attributes_expanded = false;

      // Initialize attributes now
      var decl = self.declaration = diagram.dtd_json.elements[self.name];
      if (typeof decl != "object") {
        console.error("Can't find a declaration for element " + self.name +
          " in the DTD.");
        decl = self.declaration = null;
      }
      var attrs = self.attributes = [];
      if (decl && decl.attributes) {
        decl.attributes.forEach(function(attr_spec) {
          attrs.push(Node.factory(diagram, attr_spec, self));
        });
      }
    };

    // Inherit from Node
    Node.subclasses["element"] = ElementNode;
    ElementNode.prototype = Object.create(Node.prototype);
    ElementNode.prototype.constructor = ElementNode;


    // Called the first time we need to discover the content children
    // for an ElementNode.
    ElementNode.prototype.init_content = function() {
      var self = this,
          diagram = self.diagram,
          decl = self.declaration;

      var content = self.content = [];
      if (decl && decl.content && decl.content.children) {
        decl.content.children.forEach(function(kid_spec) {
          content.push(Node.factory(diagram, kid_spec, self));
        });
      }
    };

    // Get the array of content children (as opposed to attribute children)
    // or the empty array, if there are none.
    ElementNode.prototype.get_content = function() {
      if (this.content == null) this.init_content();
      return this.content;
    };

    // Returns true if there are any content children 
    // (as opposed to attributes). 
    ElementNode.prototype.has_content = function() {
      if (this.content == null) this.init_content();
      return this.content.length > 0;
    };

    // Returns true if this Node has any attribute children.
    ElementNode.prototype.has_attributes = function() {
      return this.attributes.length > 0;
    };


    ////////////////////////////////////////////////
    // Event handlers

    ElementNode.content_click_handler = function(src_node) {
      src_node.toggle_content();
      this.diagram.update(this);
    };

    ElementNode.prototype.toggle_content = function() {
      this.content_expanded = !this.content_expanded;
      this.set_children();
    };

    ElementNode.prototype.expand_content = function() {
      this.content_expanded = true;
      this.set_children();
    };

    ElementNode.attributes_click_handler = function(src_node) {
      src_node.toggle_attributes();
      this.diagram.update(this);
    };

    ElementNode.prototype.toggle_attributes = function() {
      this.attributes_expanded = !this.attributes_expanded;
      this.set_children();
    };

    ElementNode.prototype.expand_attributes = function() {
      this.attributes_expanded = true;
      this.set_children();
    };

    ElementNode.prototype.expand = function() {
      this.content_expanded = this.attributes_expanded = true;
      this.set_children();
    };

    ElementNode.prototype.set_children = function() {
      if (!this.content_expanded && !this.attributes_expanded) {
        this.children = [];
      }
      else if (!this.content_expanded && this.attributes_expanded) {
        this.children = this.attributes;
      }
      else if (this.content_expanded && !this.attributes_expanded) {
        this.children = this.get_content();
      }
      else {
        this.children = this.attributes.concat(this.get_content());
      }
    };

    ////////////////////////////////////////////////
    // Drawing

    ElementNode.prototype.draw_enter = function() {
      var self = this,
          diagram = self.diagram,
          node_box_height = diagram.node_box_height;
      
      self.draw_enter_box();

      // Set some sizes
      self.width = diagram.node_text_margin * 2 + 
                   (self.q ? diagram.q_width : 0) +
                   (self.has_content() || self.has_attributes() 
                     ? diagram.button_width : 0) +
                   document.getElementById(self.id).getBBox()["width"];
      self.y_size = self.width + diagram.diagonal_width;


      // content expand button
      if (self.has_content()) {
        self.draw_button("content", "< >",
          self.has_attributes() ? 0 : -node_box_height / 4,
          ElementNode.content_click_handler);
      }

      // attributes expand button
      if (self.has_attributes()) {
        self.draw_button("attributes", " @ ",
          self.has_content() ? -node_box_height / 2 : -node_box_height / 4,
          ElementNode.attributes_click_handler);
      }
    };

    // Helper to draw a single content or attributes expander button
    ElementNode.prototype.draw_button = function(cls, label, y, handler) {
      var self = this,
          diagram = self.diagram,
          gs = self.gs,
          button_width = diagram.button_width,
          node_box_height = diagram.node_box_height;

      gs.append("text")
        .attr({
          "class": "button-text " + cls + "-button",
          x: 0,
          y: 0,
          "text-anchor": "baseline",
          "alignment-baseline": "middle",
        })
        .text(label)
        .style("fill-opacity", 0)
      ;
      gs.append("rect")
        .attr({
          "data-id": self.id,
          "class": "button",
          width: button_width,
          height: node_box_height / 2,
          x: self.width - button_width,
          y: y,
        })
        .on("click", handler)
      ;
    }

    ElementNode.prototype.transition_enter = function(g) {
      console.log("ElementNode.transition_enter");
      return this.transition_enter_box(g);
    };



    return ElementNode;
  }();
}

