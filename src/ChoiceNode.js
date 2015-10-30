// DtdDiagram.ChoiceNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        w = 20,
        points = "0,0 " + (w/2) + "," + (-w/2) + " " + w + ",0 " +
          (w/2) + "," + (w/2);

    // Constructor. Unlike ElementNode constructor, for these,
    // we recursively create all the child content nodes.
    var ChoiceNode = DtdDiagram.ChoiceNode = function(diagram, spec, elem_parent) {
      var self = this;
      Node.call(self, diagram, spec, elem_parent);
      if (!("q" in self)) self.q = null;

      (spec.children || []).forEach(function(kid_spec) {
        self.children.push(Node.factory(diagram, kid_spec, elem_parent));
      });
    };

    // Inherit from Node
    Node.register("choice", ChoiceNode);
    ChoiceNode.prototype = Object.create(Node.prototype);
    ChoiceNode.prototype.constructor = ChoiceNode;

    DtdDiagram.extend(
      ChoiceNode.prototype, 
      DtdDiagram.HasQNode,
      {
        width: function() { return w; },

        // Draw entering nodes
        draw_enter: function() {
          this.gs.append("polygon")
            .attr({
              'class': 'choice',
              'points': points,
            })
          ;
          this.draw_enter_q(w/2);
        },
      }
    );

  })();
}

