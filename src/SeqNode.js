// DtdDiagram.SeqNode class

(function() {
  var Node = DtdDiagram.Node,
      width = 13;


  var SeqNode = DtdDiagram.SeqNode = function() {};
  Node.register("seq", SeqNode);

  // Object methods
  DtdDiagram.extend(
    SeqNode.prototype, 
    Node.methods,
    DtdDiagram.HasQNode,
    DtdDiagram.ChoiceSeqNode,
    {
      width: function() {
        return width;
      },

      path: function() {
        var path = Node.path
            arc = Node.arc,
            s = 8;
        return path("M", 0, s/2, "v", -s) +
               arc(width/2, width, 0) +
               path("v", s) + 
               arc(width/2, -width, 0) + "z";
      },
    }
  );
})();
