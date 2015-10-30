// DtdDiagram.OtherNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        other_box_height = 18;

    // Constructor
    var OtherNode = DtdDiagram.OtherNode = function(diagram, spec, elem_parent) {
      Node.call(this, diagram, spec, elem_parent);
    };

    // Inherit from Node
    Node.subclasses["other"] = OtherNode;
    OtherNode.prototype = Object.create(Node.prototype);
    OtherNode.prototype.constructor = OtherNode;

    // Define the object methods
    DtdDiagram.extend(
      OtherNode.prototype, 
      DtdDiagram.HasLabelNode,
      {
        width: function() {
          var self = this;

          if (!("_width" in self)) {
            self._width = 
              self.diagram.node_text_margin * 2 + 
              self.label_width();
          }
          return self._width;
        },

        draw_enter: function() {
          var self = this;

          // Draw the box.
          self.gs.append("g")
            .attr("transform", "skewX(-15)")
            .append("rect")
              .attr({
                "data-id": self.id,
                "class": "box",
                width: self.width(),
                height: other_box_height,
                y: - other_box_height / 2,
                rx: 3,
                ry: 3,
              })
          ;
          self.draw_enter_label();
        },
      }
    );



  })();
}

