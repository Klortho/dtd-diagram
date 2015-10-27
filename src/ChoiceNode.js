// DtdDiagram.ChoiceNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node;

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
    Node.subclasses["choice"] = ChoiceNode;
    ChoiceNode.prototype = Object.create(Node.prototype);
    ChoiceNode.prototype.constructor = ChoiceNode;

    jQuery.extend(
      ChoiceNode.prototype, 
      DtdDiagram.HasQNode,
      {
        width: function() {
          return 24;
        },

        // Draw entering nodes
        draw_enter: function() {
          this.gs.append("polygon")
            .attr({
              'class': 'choice',
              'points': '0,0 12,-12 24,0 12,12'
            })
          ;
          this.draw_enter_q();
        },
      }
    );

  })();
}

