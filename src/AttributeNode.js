// DtdDiagram.AttributeNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        attribute_box_height = 21;

    // Constructor
    var AttributeNode = DtdDiagram.AttributeNode = function(diagram, spec, elem_parent) {
      Node.call(this, diagram, spec, elem_parent);
    };

    // Inherit from Node
    Node.subclasses["attribute"] = AttributeNode;
    AttributeNode.prototype = Object.create(Node.prototype);
    AttributeNode.prototype.constructor = AttributeNode;


    // Define the object methods
    DtdDiagram.extend(
      AttributeNode.prototype, 
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

