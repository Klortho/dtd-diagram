// DtdDiagram.AttributeNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        attribute_box_height = 21;

    // Constructor
    var AttributeNode = DtdDiagram.AttributeNode = function() {};

    // Register this type
    Node.register("attribute", AttributeNode);

    // Object methods
    DtdDiagram.extend(
      AttributeNode.prototype, 
      Node.methods,
      DtdDiagram.HasLabelNode,
      {
        draw_enter: function() {
          var self = this;

          // Draw the box.
          self.gs.append("ellipse")
            .attr({
              "data-id": self.id,
              "class": "box",
              cx: self.width() / 2,
              cy: 0,
              rx: self.width() / 2,
              ry: attribute_box_height / 2,
            })
          ;
          self.draw_enter_label();
        },
      }
    );
  })();
}

