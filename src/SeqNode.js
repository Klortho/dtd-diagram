// DtdDiagram.SeqNode class

(function() {
  var Node = DtdDiagram.Node,
      HasQNode = DtdDiagram.HasQNode,
      path = Node.path,
      arc = Node.arc,
      w = 13,
      s = 8;

  var p = path("M", 0, s/2, "v", -s) +
             arc(w/2, w, 0) +
             path("v", s) + 
             arc(w/2, -w, 0) + "z";

  // Constructor.
  var SeqNode = DtdDiagram.SeqNode = function() {};

  // Register this type
  Node.register("seq", SeqNode);

  // Object methods
  DtdDiagram.extend(
    SeqNode.prototype, 
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

      width: function() {
        return w;
      },

      // Draw entering nodes
      draw_enter: function() {
        this.gs.append("path")
          .attr({
            'class': 'seq',
            'd': p,
          })
        ;
        this.draw_enter_q(w/2);
      },
    }
  );
})();
