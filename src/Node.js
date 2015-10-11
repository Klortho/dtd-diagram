// DtdDiagram.Node class

if (DtdDiagram) {
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
      // For `choice` and `seq` nodes, the type gets
      // copied from the spec. For `element` nodes, we add the type.
      if (!this["type"]) this["type"] = "element";
    }

    Node.prototype.has_children = function() {
      return this.children || this._children;
    }

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

    // Determine the extents of a (sub)tree, returning a Box object.
    Node.prototype.tree_extents = function() {
      return (this.children || [])
        .reduce(_tree_reduce, this.extents());
    }

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
    }

    Node.prototype.collapse = function() {
      this._children = this.children;
      this.children = null;
    }

    return Node;
  }();
}

