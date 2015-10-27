// DtdDiagram.HasQNode mixin

if (typeof DtdDiagram != "undefined") {
  (function() {

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
      },
    };
  })();
}    


