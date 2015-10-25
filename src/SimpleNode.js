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

    return SimpleNode;
  }();
}

