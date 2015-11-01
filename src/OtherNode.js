// DtdDiagram.OtherNode class

(function() {
  var Node = DtdDiagram.Node,
      other_box_height = 18;

  // Constructor
  var OtherNode = DtdDiagram.OtherNode = function() {};

  // Register this type
  Node.register("other", OtherNode);

  // Object methods
  DtdDiagram.extend(
    OtherNode.prototype, 
    Node.methods,
    DtdDiagram.HasLabelNode,
    {
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
