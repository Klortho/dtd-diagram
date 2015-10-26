// DtdDiagram.SeqNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node;

    // Constructor. Unlike ElementNode constructor, for these,
    // we recursively create all the child content nodes.
    var SeqNode = function(diagram, spec, elem_parent) {
      var self = this;
      Node.call(self, diagram, spec, elem_parent);
      if (!("q" in self)) self.q = null;

      (spec.children || []).forEach(function(kid_spec) {
        self.children.push(Node.factory(diagram, kid_spec, elem_parent));
      });
    };

    // Inherit from Node
    Node.subclasses["seq"] = SeqNode;
    SeqNode.prototype = Object.create(Node.prototype);
    SeqNode.prototype.constructor = SeqNode;


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

    jQuery.extend(
      SeqNode.prototype, 
      DtdDiagram.HasQNode,
      {
        width: function() {
          return 14;
        },

        // Draw entering nodes
        draw_enter: function() {
          var self = this,
              diagram = self.diagram,
              gs = self.gs;

          gs.append("path")
            .attr({
              'class': 'seq',
              'd': seq_path_gen(7, 6, 7),
            })
          ;
          self.draw_enter_q();
        },
      }
    );
  })();
}

