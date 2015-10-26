// DtdDiagram.BoxedNode mixin

if (typeof DtdDiagram != "undefined") {
  (function() {

    // These methods are mixed in with the inheriting class' prototype
    DtdDiagram.BoxedNode = {
      width: function() {
        var self = this,
            diagram = self.diagram;

        if (!("_width" in self)) {
          self._width = 
            diagram.node_text_margin * 2 + 
            (self.has_q() ? diagram.q_width : 0) +
            (self.has_content() || self.has_attributes() 
              ? diagram.button_width : 0) +
            _label_width(diagram, self.name);
        }
        return self._width;
      },

      draw_enter: function() {
        this.draw_enter_box();
      },

      // Draw an entering node box and its label. 
      draw_enter_box: function() {
        var self = this,
            gs = self.gs,
            diagram = self.diagram,
            node_box_height = diagram.node_box_height;

        // Draw the box. Initially, it has zero width.
        gs.append("rect")
          .attr({
            "data-id": self.id,
            "class": self.type + "-box",
            width: self.width(),
            height: node_box_height,
            y: - node_box_height / 2,
            rx: 6,
            ry: 6,
          })
        ;

        // Draw the text. 
        gs.append("a")
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
    };

    // Get the displayed width for a label string. This generates a temporary
    // SVG text node, measures its width, and then destroys it. It caches
    // the results in diagram.label_width_cache.
    var _label_width = function(diagram, label) {
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
    }

  })();
}    


