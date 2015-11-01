// DtdDiagram.HasQNode mixin

(function() {
  var Node = DtdDiagram.Node,
      path = Node.path,
      arc = Node.arc,
      la = Node.la,
      arca = Node.arca,
      q_width = 12;

  // plus sign
  var s = 4,
      plus = path("M", -s, 0, "l", 2*s, 0, "M", 0, -s, "l", 0, 2*s);

  // asterisk
  var h = 4.5,
      asterisk = (function() {
        var a = -Math.PI / 2;
        var p = '';
        for (var i = 0; i < 5; ++i) {
          p += path("M", 0, 0) + la(h, a + i * 2 * Math.PI / 5);
        }
        return p;
      })();

  // question
  var r = 2.3,
      a = Math.PI / 3,
      sx = -r * Math.sin(a),
      sy = -r * (1 + Math.cos(a)),
      d = 2,
      p = 4,
      question = path("M", sx, sy) + arc(r, -sx, -sy, 1) + path("l", 0, d) +
                 "m 0,3 " + arc(.5, 0.0001, 0, 1) + "z";


  // These methods are mixed in with the inheriting class' prototype
  DtdDiagram.HasQNode = {
    initialize: function() {
      if (!("q" in this)) this.q = null;
    },

    has_q: function() {
      return !!this.q;
    },

    // Width of the `q` label, if there is one, or zero, if not
    q_width: function() {
      return this.has_q() ? q_width : 0;
    },

    // Draw the text label for `q`
    draw_enter_q: function(offset_x) {
      var self = this;
      if (!self.has_q()) return;

      var q = self.q,
          path = q == "*" ? asterisk :
                 q == "+" ? plus :
                 question;
      self.gs.append("g")
        .attr("transform", "translate(" + offset_x + ",0)")
        .append("path")
          .attr({
            'class': 'q',
            'd': path,
          })
      ;
    },
  };
})();
