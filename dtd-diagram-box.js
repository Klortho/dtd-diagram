if (DtdDiagram) {
  DtdDiagram.Box = function() {

    //--------------------------------------------------------------------
    // Box class

    var Box = function(top, left, bottom, right) {
      this.top = top;
      this.left = left;
      this.bottom = bottom;
      this.right = right;
    }
    Box.prototype.log = function(name) {
      console.log(name + ": {top: " + this.top + ", left: " + this.left + 
        ", bottom: " + this.bottom + ", right: " + this.right + "}");
    }
    Box.prototype.copy = function() {
      return new Box(this.top, this.left, this.bottom, this.right);
    }
    Box.prototype.width = function() {
      return this.right - this.left;
    }
    Box.prototype.height = function() {
      return this.bottom - this.top;
    }
    Box.prototype.vcenter = function() {
      return (this.top + this.bottom) / 2;
    }
    Box.prototype.vmove = function(d) {
      this.top += d;
      this.bottom += d;
      return this;
    }
    Box.prototype.hmove = function(d) {
      this.left += d;
      this.right += d;
      return this;
    }
    return Box;

  }();
}
