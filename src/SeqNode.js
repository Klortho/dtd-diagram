// DtdDiagram.SeqNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        path = Node.path,
        arc = Node.arc,
        w = 13,
        s = 8;

    var p = path("M", 0, s/2, "v", -s) +
               arc(w/2, w, 0) +
               path("v", s) + 
               arc(w/2, -w, 0) + "z";

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
    Node.register("seq", SeqNode);
    SeqNode.prototype = Object.create(Node.prototype);
    SeqNode.prototype.constructor = SeqNode;


    DtdDiagram.extend(
      SeqNode.prototype, 
      DtdDiagram.HasQNode,
      {
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
}

