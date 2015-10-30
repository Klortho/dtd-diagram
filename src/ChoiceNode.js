// DtdDiagram.ChoiceNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        HasQNode = DtdDiagram.HasQNode,
        w = 20,
        points = "0,0 " + (w/2) + "," + (-w/2) + " " + w + ",0 " +
          (w/2) + "," + (w/2);

    // Constructor. Unlike ElementNode constructor, for these,
    // we recursively create all the child content nodes.
    var ChoiceNode = DtdDiagram.ChoiceNode = function() {};

    // Inherit from Node
    Node.register("choice", ChoiceNode);
    ChoiceNode.prototype = Object.create(Node.prototype);
    ChoiceNode.prototype.constructor = ChoiceNode;

    DtdDiagram.extend(
      ChoiceNode.prototype, 
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

