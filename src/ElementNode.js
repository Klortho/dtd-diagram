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
      DtdDiagram.HasLabelNode,
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

        width: function() {
          var self = this,
              diagram = self.diagram;

          if (!("_width" in self)) {
            self._width = 
              diagram.node_text_margin * 2 + 
              self.q_width() +
              (self.has_content() || self.has_attributes() 
                ? diagram.button_width : 0) +
              self.label_width();
          }
          return self._width;
        },

        // Draw the initial state of the node box, label, etc.
        draw_enter: function() {
          var self = this,
              diagram = self.diagram,
              node_box_height = diagram.node_box_height;

          // Draw the box.
          self.gs.append("rect")
            .attr({
              "data-id": self.id,
              "class": "box",
              width: self.width(),
              height: node_box_height,
              y: -node_box_height / 2,
              rx: 6,
              ry: 6,
            })
          ;

          self.draw_enter_label();
          self.draw_enter_q(diagram.node_text_margin);

          // content expand button
          if (self.has_content()) {
            self.draw_button("<>",
              self.has_attributes() ? 0 : -node_box_height / 4,
              ElementNode.content_click_handler);
          }

          // attributes expand button
          if (self.has_attributes()) {
            self.draw_button("@",
              self.has_content() ? -node_box_height / 2 : -node_box_height / 4,
              ElementNode.attributes_click_handler);
          }
        },

        // Helper to draw a single content or attributes expander button
        draw_button: function(label, y, handler) {
          var self = this,
              diagram = self.diagram,
              gs = self.gs,
              button_width = diagram.button_width,
              node_box_height = diagram.node_box_height,
              width = self.width()
              m = Node.m,
              c = Node.c,
              C = Node.C,
              L = Node.L
              path = Node.path;


          var button_g = gs.append("g")
            .attr({
              "class": "button",
              transform: "translate(" +
                (width - button_width) + "," +
                (y + node_box_height / 4 - 5) + ")",
            })
            .append("g")
              .attr("transform", "scale(0.06, 0.12)");
          button_g.append("rect")
            .attr({
              "class": "ButtonBase",
              width: 220,
              height: 80,
              ry: 40,
              x: 0,
              y: 0,
            })
            .on("click", handler);
          button_g.append("rect")
            .attr({
              "class": "ButtonGlow",
              width: 220,
              height: 80,
              ry: 40,
              x: 0,
              y: 0,
              "pointer-events": "none",
            });
          button_g.append("path")
            .attr({
              "class": "reflection",
              "d": "m 40,5 140,0 " +
                   "c 11.08,0 22.51667,10.914 20,20 " +
                   "C 198.16563,31.622482 191.08,30 180,30 " +
                   "L 40,30 " +
                   "C 28.92,30 21.834332,31.622512 20,25 17.483323,15.914 28.92,5 40,5 z",
              "pointer-events": "none",
            });
          var ltpath = "m 0,0 -20.15625,7.16797 20.15625,7.12891 0,3.55469 " +
                      "-25.039062,-9.08204 0,-3.24218 25.039062,-9.08203 0,3.55468 z";
          var atpath = "m 0,0 2.46667,0 -3.15556,11 q -0.0889,0.31111 " +
                       "-0.15555,0.62223 -0.0445,0.28888 -0.0445,0.53333 0,1.02222 " +
                       "0.82223,1.02222 0.31111,0 0.86666,-0.13333 0.55556,-0.13334 " +
                       "1.2,-0.46667 0.64445,-0.33333 1.28889,-0.91111 0.66667,-0.6 " +
                       "1.2,-1.51111 0.53334,-0.91111 0.86667,-2.2 0.35555,-1.31111 " +
                       "0.35555,-3.04445 0,-2.13333 -0.86666,-3.91111 -0.84445,-1.8 " +
                       "-2.26667,-3.06666 -1.42222,-1.28889 -3.28889,-2 -1.84444,-0.71111 " +
                       "-3.84444,-0.71111 -2.62222,0 -4.88889,0.95555 -2.26667,0.95556 " +
                       "-3.93333,2.66667 -1.66667,1.68889 -2.62223,4.02222 -0.95555,2.31111 " +
                       "-0.95555,5.04444 0,2.6 0.97778,4.71112 1,2.11111 2.64444,3.62222 " +
                       "1.64444,1.48889 3.77778,2.28889 2.13333,0.82222 4.42222,0.82222 " +
                       "3.11111,0 5.46667,-1.24445 2.37777,-1.26666 3.8,-3.35555 " +
                       "l 2.46666,0 q -0.66666,1.77778 -1.93333,3.08889 -1.26667,1.28889 " +
                       "-2.93333,2.15555 -1.64445,0.86667 -3.57778,1.28889 -1.91111,0.42222 " +
                       "-3.91111,0.42222 -2.64445,0 -5.11111,-1.02222 -2.46667,-1 " +
                       "-4.37778,-2.8 -1.91111,-1.82222 -3.06667,-4.33333 -1.13333,-2.51111 " +
                       "-1.13333,-5.53333 0,-3.48889 1.2,-6.28889 1.22222,-2.8 " +
                       "3.26667,-4.75556 2.04444,-1.95555 4.73333,-3 2.71111,-1.06667 " +
                       "5.71111,-1.06667 2.44444,0 4.73333,0.86667 2.28889,0.86667 " +
                       "4.04445,2.44445 1.75555,1.55555 2.8,3.73333 1.06666,2.15555 " +
                       "1.06666,4.75555 0,2.64445 -0.8,4.66667 -0.8,2.02222 -2.11111,3.4 " +
                       "-1.31111,1.35556 -3,2.06667 -1.66666,0.68889 -3.44444,0.68889 " +
                       "-0.53333,0 -0.95556,-0.17778 -0.42222,-0.2 -0.73333,-0.51111 " +
                       "-0.28889,-0.31111 -0.48889,-0.71111 -0.17778,-0.42223 " +
                       "-0.22222,-0.88889 -0.84445,1.22222 -1.88889,1.75555 -1.04444,0.53334 " +
                       "-2.46667,0.53334 -1.28889,0 -2.33333,-0.51111 -1.02222,-0.51112 " +
                       "-1.73333,-1.33334 -0.71111,-0.84444 -1.11111,-1.88889 " +
                       "-0.37778,-1.06666 -0.37778,-2.15555 0,-1.77778 0.62222,-3.6 " +
                       "0.62222,-1.82222 1.73333,-3.28889 1.13334,-1.48889 2.68889,-2.42222 " +
                       "1.57778,-0.93334 3.48889,-0.93334 0.93333,0 1.64445,0.33334 " +
                       "0.73333,0.31111 1.24444,0.77777 0.53333,0.44445 0.86667,0.95556 " +
                       "0.33333,0.48889 0.46666,0.84444 l 0.8,-2.31111 z m -2.71111,9.11111 " +
                       "q 0.33334,-1.06666 0.51111,-1.73333 0.2,-0.68889 0.28889,-1.08889 " +
                       "0.0889,-0.42222 0.11111,-0.64444 0.0222,-0.24445 0.0222,-0.4 " +
                       "0,-0.75556 -0.26667,-1.4 -0.24445,-0.64445 -0.68889,-1.08889 " +
                       "-0.42222,-0.44445 -1,-0.68889 -0.57778,-0.26667 -1.24444,-0.26667 " +
                       "-1.11112,0 -2.17778,0.73334 -1.06667,0.73333 -1.91111,1.84444 " +
                       "-0.84445,1.11111 -1.35556,2.42222 -0.51111,1.31111 -0.51111,2.46667 " +
                       "0,0.73333 0.17778,1.44444 0.17778,0.71112 0.55555,1.28889 " +
                       "0.37778,0.55556 0.97778,0.91111 0.62222,0.33334 1.48889,0.33334 " +
                       "0.77778,0 1.53333,-0.26667 0.77778,-0.28889 1.44445,-0.8 " +
                       "0.66666,-0.53333 1.2,-1.28889 0.53333,-0.77778 0.84444,-1.77778 z";
          
          if (label == "<>") {
            button_g.append("g")
              .attr("transform", "translate(91, 22) scale(2.5, 2.8)")
              .append("path")
                .attr({
                  "d": ltpath,
                  "pointer-events": "none",
                })
                .style("fill", "black");
            button_g.append("g")
              .attr("transform", "translate(131, 22) scale(-2.5, 2.8)")
              .append("path")
                .attr({
                  "d": ltpath,
                  "pointer-events": "none",
                })
                .style("fill", "black");
            button_g.append("g")
              .attr("transform", "translate(90, 20) scale(2.5, 2.8)")
              .append("path")
                .attr({
                  "d": ltpath,
                  "pointer-events": "none",
                })
                .style("fill", "white");
            button_g.append("g")
              .attr("transform", "translate(130, 20) scale(-2.5, 2.8)")
              .append("path")
                .attr({
                  "d": ltpath,
                  "pointer-events": "none",
                })
                .style("fill", "white");
          }
          else {
            button_g.append("g")
              .attr("transform", "translate(131, 26) scale(4, 2.2)")
              .append("path")
                .attr({
                  "d": atpath,
                  "pointer-events": "none",
                })
                .style("fill", "black");
            button_g.append("g")
              .attr("transform", "translate(132, 24) scale(4, 2.2)")
              .append("path")
                .attr({
                  "d": atpath,
                  "pointer-events": "none",
                })
                .style("fill", "white");
          }
        },
      }
    );
  })();
}

