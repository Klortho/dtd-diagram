// DtdDiagram.Node class

if (typeof DtdDiagram != "undefined") {
  DtdDiagram.Node = function() {

    // Construct a Node from a specification (of any type) within a content-model 
    // of some element within the DTD.  
    // This copies everything except `children` (name, type, q).
    // Nodes start life "uninitialized", meaning the children have not yet
    // been instantiated.
    var Node = function(diagram, spec, elem_parent) {
      this.initialized = false;
      this.diagram = diagram;
      this.elem_parent = elem_parent;
      for (var k in spec) {
        if (k != "children") {
          this[k] = spec[k];
        }
      }
      // If the type is not `choice`, `seq`, or `attribute`, it must be
      // an `element`
      if (!this["type"]) this["type"] = "element";
    };

    // This is used for testing, and recursively generates a tree of Nodes from
    // JSON objects -- basically, "blessing" the existing objects as Nodes.
    var bless = Node.bless = function(diagram, node_data, elem_parent) {
      var n = new Node(diagram, node_data, elem_parent);
      if (node_data.children) {
        n.children = [];
        var new_elem_parent = (n.type == "element" ? n : elem_parent);
        node_data.children.forEach(function(kid) {
          n.children.push(bless(diagram, kid, new_elem_parent));
        });
      }
      return n;
    };

    // Returns tree if there are any element children. This caches the
    // result. If it has choice or seq children, then that implies
    // element children.
    Node.prototype.has_elem_children = function() {
      if (!("_has_elem_children" in this)) {
        var kids = this.children || this._children || [];
        var e = kids.find(function(k) {
          return k.type == "element" || k.type == "choice" ||
            k.type == "seq";
        });
        this._has_elem_children = (typeof e != "undefined");
      }
      return this._has_elem_children;
    };

    Node.prototype.has_attributes = function() {
      if (!("_has_attributes" in this)) {
        var kids = this.children || this._children || [];
        var e = kids.find(function(k) {
          return k.type == "attribute";
        });
        this._has_attributes = (typeof e != "undefined");
      }
      return this._has_attributes;
    };



    // For element nodes, this creates new child nodes from the content-model, as 
    // needed, filling in the _children array. When this returns, the (element) node 
    // is in the collapsed state.
    // For choice and seq nodes, this recurses, eventually initializing all of the
    // nodes up to the first elements or attributes that it sees.

    Node.prototype.initialize = function() {
      var self = this;

      // Make sure this is only called once
      if (self.initialized) return;
      self.initialized = true;

      if (self.type == "attribute") return;
      if (self.type == "choice" || self.type == "seq") {
        self.children.forEach(function(k) {
          k.initialize();
        });
        return;
      }

      // type is "element"
      var spec = dtd_json.elements[this.name];
      if (typeof spec != "object" || !spec["content-model"])
      {
        return;
      }

      self._children = [];

      // This recursive function looks at one spec in the content-model of the
      // dtd, and creates Nodes for it.
      function make_kid(kid_spec, parent_array, elem_parent) {
        var kid = new Node(self.diagram, kid_spec, elem_parent);
        parent_array.push(kid);

        if (kid.type == "choice" || kid.type == "seq") {
          kid.children = [];
          kid_spec.children.forEach(function(gk_spec) {
            make_kid(gk_spec, kid.children, elem_parent);
          });
        }
      }

      //spec["content-model"].forEach(function(kid_spec) {
        make_kid(spec["content-model"], self._children, self);
      //});
    }

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

    // This is called when the user clicks on a node in the tree that has
    // kids. We have to call initialize() on each of the *child* nodes,
    // so that we can render them correctly.
    Node.prototype.expand = function() {
      if (this.children == null) {
        this.children = this._children;
        this._children = null;
      }
      // Initialize each of the kids
      if (this.children != null) {
        this.children.forEach(function(k) {
          k.initialize();
        });
      }
    };

    Node.prototype.collapse = function() {
      this._children = this.children;
      this.children = null;
    };

    // Toggle children on click.
    Node.click_handler = function(src_node) {
      src_node.handle_click();
    };

    Node.prototype.handle_click = function() {
      if (this.children) {
        this.collapse();
      } 
      else {
        this.expand();
      }
      this.diagram.update(this);
    }

    return Node;
  }();
}

