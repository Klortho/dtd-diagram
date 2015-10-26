// DtdDiagram.AttributeNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node;

    // Constructor
    var AttributeNode = DtdDiagram.AttributeNode = function(diagram, spec, elem_parent) {
      Node.call(this, diagram, spec, elem_parent);
    };

    // Inherit from Node
    Node.subclasses["attribute"] = AttributeNode;
    AttributeNode.prototype = Object.create(Node.prototype);
    AttributeNode.prototype.constructor = AttributeNode;


    // Define the object methods
    jQuery.extend(
      AttributeNode.prototype, 
      DtdDiagram.BoxedNode
    );
  })();
}

