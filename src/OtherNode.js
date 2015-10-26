// DtdDiagram.OtherNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node;

    // Constructor
    var OtherNode = DtdDiagram.OtherNode = function(diagram, spec, elem_parent) {
      Node.call(this, diagram, spec, elem_parent);
    };

    // Inherit from Node
    Node.subclasses["other"] = OtherNode;
    OtherNode.prototype = Object.create(Node.prototype);
    OtherNode.prototype.constructor = OtherNode;

    // Define the object methods
    jQuery.extend(
      OtherNode.prototype, 
      DtdDiagram.BoxedNode
    );



  })();
}

