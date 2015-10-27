// DtdDiagram.HasQNode mixin

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        M = Node.M,
        l = Node.l,
        h = Node.h,
        v = Node.v,
        arc = Node.arc,
        r = 1,
        s = 3;

    var plus = M(-r, -r) + v(-s) + arc(r, 2*r, 0) +
               v(s) + h(s) + arc(r, 0, 2*r) +
               h(-s) + v(s) + arc(r, -2*r, 0) +
               v(-s) + h(-s) + arc(r, 0, -2*r) +
               h(s) + "z";

    // These methods are mixed in with the inheriting class' prototype
    DtdDiagram.HasQNode = {

      has_q: function() {
        return !!this.q;
      },

      // Default to `q` label anchored in the middle
      q_anchor: "middle",

      // Width of the `q` label, if there is one
      q_width: function() {
        return this.has_q() ? this.diagram.q_width : 0;
      },

      // Draw the text label for `q`
      draw_enter_q: function() {
        var self = this;
        if (!self.has_q()) return;

        self.gs.append("text")
          .attr({
            "class": "q",
            x: self.diagram.node_text_margin,
            y: 0,
            "text-anchor": self.type == self.q_anchor,
            "alignment-baseline": "middle",
          })
          .text(self.q)
        ;

        self.gs.append("path")
          .attr({
            'class': 'q',
            'd': plus,
          })
        ;
      },
    };
  })();
}    


