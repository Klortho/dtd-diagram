// DtdDiagram.HasQNode mixin

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        M = Node.M,
        l = Node.l,
        h = Node.h,
        v = Node.v,
        arc = Node.arc,
        la = Node.la,
        arca = Node.arca;

    // plus sign
    var s = 4,
        plus = M(-s, 0) + l(2*s, 0) + M(0, -s) + l(0, 2*s);
      /*
        r = 1,
        plus = M(-r, -r) + v(-s) + arc(r, 2*r, 0) +
               v(s) + h(s) + arc(r, 0, 2*r) +
               h(-s) + v(s) + arc(r, -2*r, 0) +
               v(-s) + h(-s) + arc(r, 0, -2*r) +
               h(s) + "z";
      */

    // asterisk
    var h = 4.5,
        asterisk = (function() {
          var a = -Math.PI / 2;
          var path = '';
          for (var i = 0; i < 5; ++i) {
            path += M(0, 0) + la(h, a + i * 2 * Math.PI / 5);
          }
          return path;
        })();
      /*
        r = 1.2,
        asterisk = (function() {
          var g = 1.7 * r,
              a = -7 * Math.PI / 10,
              path = M(g * Math.cos(a), g * Math.sin(a));
          for (var i = 0; i < 5; ++i) {
            path += la(h, a + Math.PI / 5) +
                    arca(r, 2 * r, a + 7 * Math.PI / 10) +
                    la(h, a + 6 * Math.PI / 5);
            a += 2 * Math.PI / 5;
          }
          return path + "z";
        })();
      */

    // question
    var r = 2.3,
        a = Math.PI / 3,
        sx = -r * Math.sin(a),
        sy = -r * (1 + Math.cos(a)),
        d = 2,
        p = 4,
        question = M(sx, sy) + arc(r, -sx, -sy, 1) + l(0, d) +
                   "m 0,3 " + arc(.5, 0.0001, 0, 1) + "z";


    // These methods are mixed in with the inheriting class' prototype
    DtdDiagram.HasQNode = {

      has_q: function() {
        return !!this.q;
      },

      // Default to `q` label anchored in the middle
      q_anchor: "middle",

      // Width of the `q` label, if there is one
      q_width: function() {
        return this.has_q() ? this.diagram.q_width : 0;
      },

      // Draw the text label for `q`
      draw_enter_q: function(offset_x) {
        var self = this;
        if (!self.has_q()) return;

      /*
        self.gs.append("text")
          .attr({
            "class": "q",
            x: self.diagram.node_text_margin,
            y: 0,
            "text-anchor": self.type == self.q_anchor,
            "alignment-baseline": "middle",
          })
          .text(self.q)
        ;
      */

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
}    


