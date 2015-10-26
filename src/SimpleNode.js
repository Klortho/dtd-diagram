// DtdDiagram.SimpleNode class

if (typeof DtdDiagram != "undefined") {
  DtdDiagram.SimpleNode = function() {
    var Node = DtdDiagram.Node;

    // Constructor
    var SimpleNode = function(diagram, spec, elem_parent) {
      Node.call(this, diagram, spec, elem_parent);
    };

    // Inherit from Node
    Node.subclasses["attribute"] = Node.subclasses["other"] = SimpleNode;
    SimpleNode.prototype = Object.create(Node.prototype);
    SimpleNode.prototype.constructor = SimpleNode;

    ////////////////////////////////////////////////
    // Drawing

    SimpleNode.prototype.draw_enter = function(g) {
      console.log("SimpleNode.draw_enter: d = %o, g = %o", this, g);
      this.draw_enter_box(g);
    };

    SimpleNode.prototype.transition_enter = function() {
      console.log("SimpleNode.transition_enter");
      return this.transition_enter_box();
    };

    return SimpleNode;
  }();
}

