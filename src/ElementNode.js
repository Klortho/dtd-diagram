// DtdDiagram.ElementNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node;


    // Constructor.
    var ElementNode = DtdDiagram.ElementNode = function(diagram, spec, elem_parent) {
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


    // Class methods

    ElementNode.content_click_handler = function(src_node) {
      src_node.toggle_content();
      src_node.diagram.update(src_node);
    };

    ElementNode.attributes_click_handler = function(src_node) {
      src_node.toggle_attributes();
      src_node.diagram.update(src_node);
    };


    // Define the object methods
    jQuery.extend(
      ElementNode.prototype, 
      DtdDiagram.BoxedNode,
      DtdDiagram.HasQNode,
      {
        // Called the first time we need to discover the content children
        // for an ElementNode.
        init_content: function() {
          var self = this,
              diagram = self.diagram,
              decl = self.declaration;

          var content = self.content = [];
          if (decl && decl.content && decl.content.children) {
            decl.content.children.forEach(function(kid_spec) {
              content.push(Node.factory(diagram, kid_spec, self));
            });
          }
        },

        // Get the array of content children (as opposed to attribute children)
        // or the empty array, if there are none.
        get_content: function() {
          if (this.content == null) this.init_content();
          return this.content;
        },

        // Returns true if there are any content children 
        // (as opposed to attributes). 
        has_content: function() {
          if (this.content == null) this.init_content();
          return this.content.length > 0;
        },

        // Returns true if this Node has any attribute children.
        has_attributes: function() {
          return this.attributes.length > 0;
        },

        has_q: function() {
          return !!this.q;
        },

        // Event handlers
        // --------------

        toggle_content: function() {
          this.content_expanded = !this.content_expanded;
          this.set_children();
        },

        expand_content: function() {
          this.content_expanded = true;
          this.set_children();
        },


        toggle_attributes: function() {
          this.attributes_expanded = !this.attributes_expanded;
          this.set_children();
        },

        expand_attributes: function() {
          this.attributes_expanded = true;
          this.set_children();
        },

        expand: function() {
          this.content_expanded = this.attributes_expanded = true;
          this.set_children();
        },

        set_children: function() {
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
        },

        // Drawing
        // -------

        // anchor for the `q` label, overrides default
        q_anchor: "start",

        // Draw the initial state of the node box, label, etc.
        draw_enter: function() {
          var self = this,
              diagram = self.diagram,
              node_box_height = diagram.node_box_height;

          self.draw_enter_box();
          self.draw_enter_q();

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
        },

        // Helper to draw a single content or attributes expander button
        draw_button: function(cls, label, y, handler) {
          var self = this,
              diagram = self.diagram,
              gs = self.gs,
              button_width = diagram.button_width,
              node_box_height = diagram.node_box_height,
              width = self.width();

          gs.append("text")
            .attr({
              "class": "button-text " + cls + "-button",
              x: width - button_width,
              y: y + node_box_height / 4,
              "text-anchor": "baseline",
              "alignment-baseline": "middle",
            })
            .text(label)
          ;
          gs.append("rect")
            .attr({
              "data-id": self.id,
              "class": "button",
              width: button_width,
              height: node_box_height / 2,
              x: width - button_width,
              y: y,
            })
            .on("click", handler)
          ;
        },

      }
    );
  })();
}

