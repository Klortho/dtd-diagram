// DtdDiagram.Box class.
// Holds coordinates for top, left, bottom, and right. Has methods for
// moving the box, vertically or horizontally.

(function() {

  var Box = DtdDiagram.Box = function(top, left, bottom, right) {
    this.top = top;
    this.left = left;
    this.bottom = bottom;
    this.right = right;
  }

  // Object methods
  DtdDiagram.extend(
    Box.prototype, 
    {
      log: function(name) {
        console.log(name + ": {top: " + this.top + ", left: " + this.left + 
          ", bottom: " + this.bottom + ", right: " + this.right + "}");
      },
      copy: function() {
        return new Box(this.top, this.left, this.bottom, this.right);
      },
      width: function() {
        return this.right - this.left;
      },
      height: function() {
        return this.bottom - this.top;
      },
      vcenter: function() {
        return (this.top + this.bottom) / 2;
      },
      vmove: function(d) {
        this.top += d;
        this.bottom += d;
        return this;
      },
      hmove: function(d) {
        this.left += d;
        this.right += d;
        return this;
      },
    }
  );
})();
