// DtdDiagram.ChoiceSeqNode class

if (typeof DtdDiagram != "undefined") {
  DtdDiagram.ChoiceSeqNode = function() {
    var Node = DtdDiagram.Node;

    // Constructor. Unlike ElementNode constructor, for these,
    // we recursively create all the child content nodes.
    var ChoiceSeqNode = function(diagram, spec, elem_parent) {
      var self = this;
      Node.call(self, diagram, spec, elem_parent);
      if (!("q" in self)) self.q = null;

      (spec.children || []).forEach(function(kid_spec) {
        self.children.push(Node.factory(diagram, kid_spec, self));
      });
    };

    // Inherit from Node
    Node.subclasses["choice"] = Node.subclasses["seq"] = ChoiceSeqNode;
    ChoiceSeqNode.prototype = Object.create(Node.prototype);
    ChoiceSeqNode.prototype.constructor = ChoiceSeqNode;


    ////////////////////////////////////////////////
    // Drawing

    ChoiceSeqNode.prototype.draw_enter = function() {
      var self = this,
          diagram = self.diagram;

      // Set some sizes
      self.width = self.type == "choice" ? 
        diagram.choice_node_width : diagram.seq_node_width;
      self.y_size = self.width + diagram.diagonal_width;
    };

    ChoiceSeqNode.prototype.transition_enter = function() {
      return null;
    };


    return ChoiceSeqNode;
  }();
}

