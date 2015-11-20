// DtdDiagram.HasLabelNode mixin

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node;

    // These methods are mixed in with the inheriting class' prototype
    DtdDiagram.HasLabelNode = {

      // Draw an entering label. 
      draw_enter_label: function() {
        var self = this,
            diagram = self.diagram;

        var container = self.gs;

        container.append("text")
          .attr({
            id: self.id,
            "class": "label",
            x: Node.node_text_margin + self.q_width(),
            y: 0,
            "text-anchor": "baseline",
            "alignment-baseline": "middle",
          })
          .text(self.name)
        ;
      },

      // Get the displayed width for a label string. This generates a temporary
      // SVG text node, measures its width, and then destroys it. It caches
      // the results in diagram.label_width_cache.
      // Return value includes 2*node_text_margin.
      label_width: function() {
        var self = this,
            diagram = self.diagram,
            label = self.name;

        if (!("label_width_cache" in diagram)) {
          diagram.label_width_cache = {};
        }
        var cache = diagram.label_width_cache;
        if (!(label in cache)) {
          var text = diagram.svg_g
            .append("text")
              .attr({
                "id": "temporary-label",
                "class": "label",
                x: 0,
                y: 0,
              })
              .text(label)
              .style("fill-opacity", 0)
          ;
          cache[label] = 2 * Node.node_text_margin +
            document.getElementById("temporary-label").getBBox()["width"];
          text.remove();
        }
        return cache[label];
      },

      compute_width: function() {
          return this.label_width();
      },
    };
  })();
}    


