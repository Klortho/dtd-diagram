// DtdDiagram.HasLabelNode mixin

if (typeof DtdDiagram != "undefined") {
  (function() {

    // These methods are mixed in with the inheriting class' prototype
    DtdDiagram.HasLabelNode = {

      // Draw an entering label. 
      draw_enter_label: function() {
        var self = this,
            diagram = self.diagram;

        // Draw the text. 
        self.gs.append("a")
          // FIXME: need to use URL templates
          .attr("xlink:href", diagram.tag_doc_url + "elem-" + self.name)
          .append("text")
            .attr({
              id: self.id,
              "class": "label",
              x: diagram.node_text_margin +
                 (self.q ? diagram.q_width : 0),
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
          cache[label] = 
            document.getElementById("temporary-label").getBBox()["width"];
          text.remove();
        }
        return cache[label];
      },
    };
  })();
}    


