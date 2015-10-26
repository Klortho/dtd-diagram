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

      // Text label for `q`
      draw_enter_q: function() {
        var self = this,
            gs = self.gs,
            diagram = self.diagram;
        if (!self.q) return;

        gs.append("text")
          .attr({
            "class": "q",
            x: diagram.node_text_margin,
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


