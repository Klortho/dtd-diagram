// DtdDiagram.Canvas class
// The main class method, scroll_resize, handles resizing the
// main drawing object and scrolling the viewport.

// To do auto-resizing and auto-scrolling, here is the algorithm:
// - find the new drawing size
// - figure out the new size of the canvas (not always the same)
// - compute the "cover box", which is the smallest box that the viewport
//   should cover in the new layout
// - find out where the viewport is now
// - figure where to move the viewport to -- move it the smallest amount that 
//   will cause it to be over the cover box.

(function() {

  var Canvas = DtdDiagram.Canvas = {
    // Constants
    dropshadow_margin: 5,
  };



  // The main function of this module. It takes the diagram as an argument,
  // computes everything, kicks off the transformation.
  // This returns a Promise.  The "do_last" attribute of the returned object,
  // if defined, is a function that should be called when all other animations are
  // resolved.
  Canvas.scroll_resize = function(diagram) {
    compute_new_canvas(diagram);

    return Promise.all([
      // Scroll the canvas
      scroll_canvas(diagram),
      // At the same time, transition the svg coordinates
      new Promise(function(resolve, reject) {
        diagram.svg_g.transition()
          .duration(diagram.duration)
          .attr({"transform": "translate(0, " + (-diagram.new_canvas.top) + ")"})
          .each("end", function() {
            resolve("done transitioning svg coordinates");
          });
      })
    ]);
  }

  // If the drawing is getting smaller, we resize the canvas at the end
  Canvas.finish = function(diagram) {
    if (!diagram.embiggenning) resize_canvas(diagram);
  }

  // Compute the new parameters for the new canvas and viewport
  var compute_new_canvas = function(diagram) {
    // Some local-variable shortcuts
    var Box = DtdDiagram.Box,
        min_canvas_height = diagram.min_canvas_height,
        min_canvas_width = diagram.min_canvas_width,
        src_node = diagram.src_node,
        canvas = diagram.canvas;

    // Determine the new extents of the whole drawing -- this is a Box object.
    var new_drawing = diagram.new_drawing = diagram.current_root_node.tree_extents();
    new_drawing.bottom += Canvas.dropshadow_margin;
    //new_drawing.log("new_drawing");

    // From that, determine the new dimensions of the svg canvas
    var nc_top = new_drawing.height() >= min_canvas_height ?
        new_drawing.top :
        (new_drawing.bottom + new_drawing.top - min_canvas_height) / 2;
    var nc_bottom = new_drawing.height() >= min_canvas_height ?
        new_drawing.bottom :
        nc_top + min_canvas_height;
    var new_canvas = diagram.new_canvas = new Box(
        nc_top, 
        new_drawing.left,
        nc_bottom,
        new_drawing.width() >= min_canvas_width ?
          new_drawing.right :
          new_drawing.left + min_canvas_width
    );
    //new_canvas.log("new_canvas");

    // Get the extents of the src_node (the node the user clicked on) 
    // and its subtree.
    var src_node_extents = src_node.extents();
    var stree_extents = src_node.tree_extents();
    //stree_extents.log("stree_extents");

    // Compute the box that the viewport needs to cover. This will:
    // - fit entirely inside the viewport
    // - contain the src_node node
    // - subject to those constraints, cover as much of the stree as possible
    var cover_box = stree_extents.copy();

    // If it's too wide, then move the right edge over, so that the 
    // the src_node node is in the viewport, and the width is correct
    if (cover_box.width() > min_canvas_width) {
      cover_box.right = cover_box.left + min_canvas_width;
    }

    // If it's too tall, then center the cover_box vertically, with the
    // constraint that the src_node is in the viewport
    if (cover_box.height() > min_canvas_height) {
      // Find what the top and bottom would be, with the viewport centered
      var vcenter = cover_box.vcenter();
      var want_top = vcenter - min_canvas_height / 2;
      var want_bottom = vcenter + min_canvas_height / 2;
      // Make sure the src_node node is contained
      var nudge =
          src_node_extents.top < want_top ? src_node_extents.top - want_top :
          src_node_extents.bottom > want_bottom ? src_node_extents.bottom - want_bottom :
          0;
      cover_box.top = want_top + nudge;
      cover_box.bottom = want_bottom + nudge;
    }
    //cover_box.log("cover_box");

    // Where is the viewport now? We can't rely on the old value, because the
    // user might have been mucking with the scroll bars.
    var container_dom = diagram.container_dom,
        scroll_top = container_dom.scrollTop,
        scroll_left = container_dom.scrollLeft;
    var viewport = diagram.viewport = new Box(
        scroll_top + canvas.top,
        scroll_left,
        scroll_top + canvas.top + min_canvas_height,
        scroll_left + min_canvas_width
    );
    //viewport.log("viewport");

    // Compute where the new viewport will be. First move it to cover the
    // cover box, then make sure it is within the canvas
    var new_viewport = diagram.new_viewport = viewport.copy();
    new_viewport.vmove(
      cover_box.top < new_viewport.top ?
        cover_box.top - new_viewport.top :
      cover_box.bottom > new_viewport.bottom ?
        cover_box.bottom - new_viewport.bottom :
      0
    );
    new_viewport.vmove(
      new_canvas.top > new_viewport.top ?
        new_canvas.top - new_viewport.top :
      new_canvas.bottom < new_viewport.bottom ?
        new_canvas.bottom - new_viewport.bottom :
      0
    );
    new_viewport.hmove(
      cover_box.left < new_viewport.left ?
        cover_box.left - new_viewport.left :
      cover_box.right > new_viewport.right ?
        cover_box.right - new_viewport.right :
      0
    );
    new_viewport.hmove(
      new_canvas.left > new_viewport.left ?   // should never happen, both are 0
        new_canvas.left - new_viewport.left :
      new_canvas.right < new_viewport.right ?
        new_canvas.right - new_viewport.right :
      0
    );
    //new_viewport.log("new_viewport");

    diagram.embiggenning = 
      new_canvas.width() > canvas.width() || 
      new_canvas.height() > canvas.height(); 
  };

  // Resize the canvas
  function resize_canvas(diagram) {
    var container_dom = diagram.container_dom,
        new_canvas = diagram.new_canvas,
        w = new_canvas.width(),
        h = new_canvas.height();
    diagram.svg.style({
      "width": w,
      "height": h,
    });
    // The following lines are an ugly hack that seems to be necessary
    // for webkit browsers, to get them to re-compute the scroll bars
    // for the container div, once the child has resized.
    container_dom.style.display = "none";
    container_dom.style.display = "block";
  }

  // Here's a "tweener" function, for adjusting the scrollTop and scrollLeft
  // properties of the container div. It's based on this code block,
  // http://bl.ocks.org/humbletim/5507619.
  function tweener(new_top, new_left) {
    return function() {
      // Here, `this` is container_dom
      var top_i = d3.interpolateNumber(this.scrollTop, new_top);
      var left_i = d3.interpolateNumber(this.scrollLeft, new_left);
      return function(t) { 
        this.scrollTop = top_i(t); 
        this.scrollLeft = left_i(t);
      };
    };
  }

  // This returns a Promise that will scroll the 
  // canvas, both vertically and horizontally at the same time,
  // if necessary.
  function scroll_canvas(diagram) {
    var new_viewport = diagram.new_viewport,
        container_dom = diagram.container_dom;

    // If the diagram is getting larger, we resize it first
    if (diagram.embiggenning) resize_canvas(diagram);

    new_scroll_top = new_viewport.top - diagram.new_canvas.top;
    new_scroll_left = new_viewport.left;
    //console.log("new_scroll _top = " + new_scroll_top + 
    //            ", _left = " + new_scroll_left);

    return new Promise(function(resolve, reject) {
      if (container_dom.scrollTop != new_scroll_top || 
          container_dom.scrollLeft != new_scroll_left) 
      {
        diagram.container_d3.transition()
          .duration(diagram.duration)
          .tween("uniquetweenname1", tweener(new_scroll_top, new_scroll_left))
          .each("end", function() {
            resolve("done scroll_canvas to " + new_scroll_top + ", " + new_scroll_left);
          })
        ;
      }
      else {
        resolve("scroll_canvas: nothing to do");
      }
    });
  }
})();
