// DtdDiagram.ChoiceNode class

(function() {
  var Node = DtdDiagram.Node,
      width = 20;

  var ChoiceNode = DtdDiagram.ChoiceNode = function() {};
  Node.register("choice", ChoiceNode);

  // Object methods
  DtdDiagram.extend(
    ChoiceNode.prototype, 
    Node.methods,
    DtdDiagram.HasQNode,
    DtdDiagram.ChoiceSeqNode,
    {
      width: function() { return width; },

      path: function() {        
        return Node.path("M", 0, 0, "L", width/2, -width/2, "L", width, 0, "L", 
                         width/2, width/2, "z")
      },
    }
  );

})();
