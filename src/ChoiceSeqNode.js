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
        self.children.push(Node.factory(diagram, kid_spec, elem_parent));
      });
    };

    // Inherit from Node
    Node.subclasses["choice"] = Node.subclasses["seq"] = ChoiceSeqNode;
    ChoiceSeqNode.prototype = Object.create(Node.prototype);
    ChoiceSeqNode.prototype.constructor = ChoiceSeqNode;


    ////////////////////////////////////////////////
    // Drawing

    // Helper function generates a bulbous sequence figure, which is supposed
    // to look like a stylized vertical ellipsis, with room for 
    // a quantifier in the center circle.
    var seq_path_gen = function(cr, d, r) {
      var yp = (cr * cr - r * r + d * d) / (2 * d);
      var xp = Math.sqrt(cr * cr - yp * yp),
          x1 = cr - xp, 
          x2 = cr + xp;
      return 'M ' + x1 + ' ' + (-yp) + ' ' +
        'A ' +  r + ' ' +  r + ' 0   1 1 ' + x2 + ' ' + (-yp) + ' ' +
        'A ' + cr + ' ' + cr + ' 0   0 1 ' + x2 + ' ' + yp + ' ' +
        'A ' +  r + ' ' +  r + ' 0   1 1 ' + x1 + ' ' + yp + ' ' +
        'A ' + cr + ' ' + cr + ' 0   0 1 ' + x1 + ' ' + (-yp) + ' ' +
        'z';
    }


    ChoiceSeqNode.prototype.draw_enter = function() {
      var self = this,
          diagram = self.diagram,
          gs = self.gs;

      // Set some sizes
      self.width = self.type == "choice" ? 
        diagram.choice_node_width : diagram.seq_node_width;
      self.y_size = self.width + diagram.diagonal_width;

      if (self.type == "choice") {
        gs.append("polygon")
          .attr({
            'class': 'choice',
            'points': '0,0 12,-12 24,0 12,12'
          })
        ;
      }
      else {
        gs.append("path")
          .attr({
            'class': 'seq',
            'd': seq_path_gen(7, 6, 7),
          })
        ;
      }
      self.draw_enter_q();

    };



    return ChoiceSeqNode;
  }();
}

