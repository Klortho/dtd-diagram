// DtdDiagram.ChoiceSeqNode mixin.

(function() {

  // Object methods
  DtdDiagram.ChoiceSeqNode = {
    initialize: function() {
      var self = this;
      DtdDiagram.HasQNode.initialize.call(self);
      (self.spec.children || []).forEach(function(kid_spec) {
        self.children.push(
          DtdDiagram.Node.factory(self.diagram, kid_spec, self.elem_parent));
      });
    },

    get_content: function() {
      return this.get_children();
    },

    // Draw entering nodes
    draw_enter: function() {
      this.gs.append("path")
        .attr({
          'class': this.type,
          'd': this.path(),
        })
      ;
      this.draw_enter_q(this.width()/2);
    },
  };

})();
