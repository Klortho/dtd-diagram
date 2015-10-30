// DtdDiagram.ChoiceNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        HasQNode = DtdDiagram.HasQNode,
        w = 20,
        points = "0,0 " + (w/2) + "," + (-w/2) + " " + w + ",0 " +
          (w/2) + "," + (w/2);

    // Constructor. 
    var ChoiceNode = DtdDiagram.ChoiceNode = function() {};

    // Register this type
    Node.register("choice", ChoiceNode);

    // Object methods
    DtdDiagram.extend(
      ChoiceNode.prototype, 
      Node.methods,
      HasQNode,
      {
        initialize: function() {
          var self = this;
          HasQNode.initialize.call(self);

          (self.spec.children || []).forEach(function(kid_spec) {
            self.children.push(Node.factory(self.diagram, kid_spec, self.elem_parent));
          });
        },

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

