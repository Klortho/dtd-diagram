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

    SimpleNode.prototype.draw_enter = function() {
      var self = this,
          diagram = self.diagram;

      self.draw_enter_box();

      // Set some sizes
      self.width = diagram.node_text_margin * 2 + 
                   document.getElementById(self.id).getBBox()["width"];
      self.y_size = self.width + diagram.diagonal_width;
    };

    SimpleNode.prototype.transition_enter = function() {
      console.log("SimpleNode.transition_enter");
      return this.transition_enter_box();
    };

    return SimpleNode;
  }();
}

