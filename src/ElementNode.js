// DtdDiagram.ElementNode class

(function() {
  var Node = DtdDiagram.Node,
      HasLabelNode = DtdDiagram.HasLabelNode,
      HasQNode = DtdDiagram.HasQNode,
      button_width = 15;

  // Constructor.
  var ElementNode = DtdDiagram.ElementNode = function() {};

  // Register this type
  Node.register("element", ElementNode);

  // Class methods

  ElementNode.content_click_handler = function(n) {
    n.toggle_content();
    n.diagram.update(n);
    if (typeof n.diagram.event_handler == "function")
      n.diagram.event_handler("content-click", n);
  };

  ElementNode.attributes_click_handler = function(n) {
    n.toggle_attributes();
    n.diagram.update(n);
    if (typeof n.diagram.event_handler == "function")
      n.diagram.event_handler("attributes-click", n);
  };

  ElementNode.rebase_click_handler = function(n) {    
    // If it's totally collapsed, go ahead and expand it
    if (!n.content_expanded && !n.attributes_expanded) {
      n.expand_content();
      n.expand_attributes();
    }
    n.diagram.rebase(n);
    if (typeof n.diagram.event_handler == "function")
      n.diagram.event_handler("rebase", n);
  }

  // Object methods

  DtdDiagram.extend(
    ElementNode.prototype, 
    Node.methods,
    HasLabelNode,
    HasQNode,
    {
      initialize: function() {
        var self = this,
            diagram = self.diagram;
        HasQNode.initialize.call(self);

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
      },

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
      // or the empty array, if there are none. Causes children to be
      // instantiated from the dtd spec, if they haven't been before.
      get_content: function() {
        if (this.content == null) this.init_content();
        return this.content;
      },

      // Returns true if there are any content children 
      // (as opposed to attributes). Causes children to be instantiated,
      // if they haven't been before.
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

      collapse_content: function() {
        this.content_expanded = false;
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

      collapse_attributes: function() {
        this.attributes_expanded = false;
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
        var cexp = this.content_expanded,
            aexp = this.attributes_expanded;

        if (!cexp && !aexp) {
          this.children = [];
        }
        else if (!cexp && aexp) {
          this.children = this.attributes;
        }
        else if (cexp && !aexp) {
          this.children = this.get_content();
        }
        else {
          this.children = this.attributes.concat(this.get_content());
        }

        if (this.gs) {
          this.gs.select('.cb rect').attr("class", 
            cexp ? "expanded" : "collapsed");
          this.gs.select('.ab rect').attr("class", 
            aexp ? "expanded" : "collapsed");
        }
      },

      // Drawing
      // -------

      compute_width: function() {
        return this.q_width() +
            (this.has_content() || this.has_attributes() 
              ? button_width : 0) +
            this.label_width();
      },

      // Draw the initial state of the node box, label, etc.
      draw_enter: function() {
        var self = this,
            diagram = self.diagram,
            gs = self.gs,
            node_box_height = Node.node_box_height;

        // Draw the box.
        gs.append("rect")
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
        self.draw_enter_q(Node.node_text_margin);

        // content expand button
        if (self.has_content()) {
          self.draw_button("cb",
            self.has_attributes() ? node_box_height / 4 - 0.5 : 0,
            ElementNode.content_click_handler);
        }

        // attributes expand button
        if (self.has_attributes()) {
          self.draw_button("ab",
            self.has_content() ? -node_box_height / 4 + 0.5 : 0,
            ElementNode.attributes_click_handler);
        }

        // rebase button
        var button_g = gs.append("g")
          .attr({
            "class": "button rebase",
            "transform": "translate(2, -16)",
          });
        button_g.append("rect")
          .attr({
            'class': "collapsed",
            width: 10,
            height: 5,
            x: 0,
            y: 0,
            rx: 2.5,
            ry: 2.5,
            transform: "translate(0,5)",
          })
          .on('click', ElementNode.rebase_click_handler);
      },

      // Helper to draw a single content or attributes expander button
      // `button_type` is either "cb" or "ab".
      draw_button: function(button_type, y, handler) {
        var self = this,
            diagram = self.diagram,
            gs = self.gs,
            node_box_height = Node.node_box_height,
            width = self.width();

        var button_g = gs.append("g")
          .attr({
            "class": "button " + button_type,
            "transform": "translate(" + (width - button_width - 2) + 
                         "," + (y + node_box_height / 4 - 16.2) + ")",
          });

        var expanded = button_type == 'cb' ?
          self.content_expanded : self.attributes_expanded;
        var cls = expanded ? "expanded" : "collapsed";
        button_g.append("rect")
          .attr({
            'class': cls,
            width: 15,
            height: 10,
            x: 0,
            y: 0,
            rx: 5,
            ry: 5,
            transform: "translate(0,5)",
          })
          .on('click', handler);

        // Draw the button label - either "< >" or "@"
        if (button_type == "cb") {
          button_g.append('g')
            .attr("transform", "translate(-0.56249982,0)")
            .attr("pointer-events", "none")
            .html(
              '<g transform="matrix(0.93056698,0,0,1.2232143,-0.79346636,-1.1542969)">' +
              '  <path d="m 2.5245,8.71325 6.076,-2.842 0,1.022 -4.97,2.268 4.956,2.268 0.014,1.022 -6.076,-2.842 0,-0.896" />' +
              '</g>' +
              '<g transform="matrix(-0.93056698,0,0,1.2232143,16.918466,-1.1542969)">' +
              '  <path d="m 2.5245,8.71325 6.076,-2.842 0,1.022 -4.97,2.268 4.956,2.268 0.014,1.022 -6.076,-2.842 0,-0.896"/>' +
              '</g>'
            );
        }
        else {
          button_g.append('path')
            .attr("pointer-events", "none")
            .attr('d', "m 8.136125,11.77975 c -5.6e-6,-0.07466 0.00466,-0.139997 0.014,-0.196 -0.3546719,0.550669 -0.9006713,0.826002 -1.638,0.826 -0.4480035,2e-6 -0.8120031,-0.149331 -1.092,-0.448 -0.2706692,-0.307997 -0.4060024,-0.704663 -0.406,-1.19 -2.4e-6,-0.8493287 0.3079973,-1.5959946 0.924,-2.24 0.615996,-0.6533266 1.3299953,-0.979993 2.142,-0.98 0.186661,7e-6 0.3919941,0.028007 0.616,0.084 l 0.28,0.07 c 0.037327,0.018674 0.083994,0.028007 0.14,0.028 0.04666,6.9e-6 0.1259933,-0.023326 0.238,-0.07 0.1493264,-0.065326 0.2566596,-0.097993 0.322,-0.098 0.1399928,7e-6 0.2099927,0.060674 0.21,0.182 -7.3e-6,0.028007 -0.00934,0.07934 -0.028,0.154 l -0.07,0.266 -0.798,2.982 c -0.028006,0.112003 -0.042006,0.20067 -0.042,0.266 -6.4e-6,0.168003 0.08866,0.252003 0.266,0.252 0.3453264,3e-6 0.667326,-0.223997 0.966,-0.672 0.419992,-0.625329 0.629992,-1.3486617 0.63,-2.17 -8e-6,-0.7746601 -0.256675,-1.4186595 -0.77,-1.932 -0.504007,-0.5133251 -1.1433397,-0.7699915 -1.918,-0.77 -1.0920045,8.5e-6 -2.0440035,0.4386747 -2.856,1.316 -0.8026686,0.8680063 -1.2040015,1.8900053 -1.204,3.066 -1.5e-6,0.91467 0.2939982,1.680002 0.882,2.296 0.587997,0.606668 1.3253296,0.910001 2.212,0.91 0.5226616,10e-7 0.9519945,-0.06067 1.288,-0.182 0.3453271,-0.130665 0.77466,-0.382665 1.288,-0.756 0.1866593,-0.139998 0.340659,-0.209998 0.462,-0.21 0.177326,2e-6 0.265992,0.084 0.266,0.252 -8e-6,0.177335 -0.121341,0.359335 -0.364,0.546 -0.9240066,0.728001 -1.9413389,1.092 -3.052,1.092 -1.1293367,0 -2.0720024,-0.373333 -2.828,-1.12 -0.7466676,-0.755998 -1.1200005,-1.698664 -1.12,-2.828 -5e-7,-1.3626612 0.503999,-2.5479934 1.512,-3.556 1.0173303,-1.0173247 2.2166624,-1.5259908 3.598,-1.526 1.0453267,9.2e-6 1.894659,0.3080089 2.548,0.924 0.662658,0.6160076 0.993991,1.4186735 0.994,2.408 -9e-6,1.1106714 -0.406009,2.081337 -1.218,2.912 -0.494674,0.504002 -1.0126736,0.756002 -1.554,0.756 -0.2426728,2e-6 -0.4433393,-0.06066 -0.602,-0.182 -0.1586723,-0.121331 -0.2380056,-0.275331 -0.238,-0.462 m 0.294,-1.904 0.378,-1.4 c -0.2800059,-0.1399937 -0.5506723,-0.2099937 -0.812,-0.21 -0.5413382,6.3e-6 -1.0173377,0.2380061 -1.428,0.714 -0.4013369,0.4760051 -0.6020034,1.031338 -0.602,1.666 -3.4e-6,0.644003 0.2799963,0.966003 0.84,0.966 0.7746617,3e-6 1.3159945,-0.578663 1.624,-1.736")
        }
      },

      // Override the update transition function here, because in the case
      // where we're rebasing, the `q` gets deleted, and we need to redraw
      // the button
      transition_update: function() {
        if (this.redraw) {
          this.gs.html("");
          this.draw_enter();
          this.redraw = false;
        }
        Node.methods.transition_update.call(this);
      },

      // The state of this ElementNode, as a string of three "0"s 
      // and "1"s. 
      state: function() {
        return (this.attributes_expanded ? "1" : "0") +
               (this.content_expanded ? "1" : "0") +
               this.state_children();
      },

      // Set the expand/collapse state of this node and all it's children.
      // Returns the new bi index value
      set_state: function(b, bi) {
        if (typeof bi == "undefined") bi = 0;
        this.attributes_expanded = (b.charAt(bi) == "1");
        this.content_expanded = (b.charAt(bi+1) == "1");
        console.log("setting state of " + this.name + " to " + 
          this.attributes_expanded + ", " + this.content_expanded);
        this.set_children();
        return this.set_state_children(b, bi+2);
      },
    }
  );
})();
