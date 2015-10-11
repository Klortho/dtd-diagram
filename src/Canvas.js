function scroll_resize(diagram) {
  var root = diagram.root;

        //--------------------------------------------------------------------
        // FIXME: is there any way to snip out everything here between these
        // lines, and put it into its own module?


        // To do auto-resizing of the drawing, and auto-scrolling, here is the
        // algorithm:
        // - find the new drawing size
        // - figure out the new size of the canvas (not always the same)
        // - compute the "cover box", which is the smallest box that the viewport
        //   should cover in the new layout
        // - find out where the viewport is now
        // - figure where to move the viewport to -- the smallest amount that will
        //   cause it to be over the cover box.

        // Determine the new extents of the whole drawing -- this is a Box object.
        var new_drawing = root.tree_extents();
        new_drawing.bottom += dropshadow_margin;
        //new_drawing.log("new_drawing");

        // From that, determine the new dimensions of the svg canvas
        var nc_top = new_drawing.height() >= min_canvas_height ?
            new_drawing.top :
            (new_drawing.bottom + new_drawing.top - min_canvas_height) / 2;
        var nc_bottom = new_drawing.height() >= min_canvas_height ?
            new_drawing.bottom :
            nc_top + min_canvas_height;
        var new_canvas = new Box(
            nc_top, 
            new_drawing.left,
            nc_bottom,
            new_drawing.width() >= min_canvas_width ?
              new_drawing.right :
              new_drawing.left + min_canvas_width
        );
        //new_canvas.log("new_canvas");

        // Get the extents of the source (the node the user clicked on) 
        // and its subtree.
        var source_extents = source.extents();
        var stree_extents = source.tree_extents();
        //stree_extents.log("stree_extents");

        // Compute the box that the viewport needs to cover. This is guaranteed to:
        // - fit entirely inside the viewport
        // - contain the source node
        // - subject to those constraints, cover as much of the stree as possible
        var cover_box = stree_extents.copy();

        // If it's too wide, then move the right edge over, so that the 
        // the source node is in the viewport, and the width is correct
        if (cover_box.width() > min_canvas_width) {
          cover_box.right = cover_box.left + min_canvas_width;
        }

        // If it's too tall, then center the cover_box vertically, with the
        // constraint that the source node is in the viewport
        if (cover_box.height() > min_canvas_height) {
          // Find what the top and bottom would be, with the viewport centered
          var vcenter = cover_box.vcenter();
          var want_top = vcenter - min_canvas_height / 2;
          var want_bottom = vcenter + min_canvas_height / 2;
          // Make sure the source node is contained
          var nudge =
              source_extents.top < want_top ? source_extents.top - want_top :
              source_extents.bottom > want_bottom ? source_extents.bottom - want_bottom :
              0;
          cover_box.top = want_top + nudge;
          cover_box.bottom = want_bottom + nudge;
        }
        //cover_box.log("cover_box");

        // Where is the viewport now? We can't rely on the old value, because the
        // user might have been mucking with the scroll bars.
        var scroll_top = container_dom.scrollTop;
        var scroll_left = container_dom.scrollLeft;
        console.log("scroll _top = " + scroll_top + " _left = " + scroll_left);
        var viewport = new Box(
            scroll_top + canvas.top,
            scroll_left,
            scroll_top + canvas.top + min_canvas_height,
            scroll_left + min_canvas_width
        );
        //viewport.log("viewport");

        // Compute where the new viewport will be. First move it to cover the
        // cover box, then make sure it is within the canvas
        var new_viewport = viewport.copy();
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

        new_scroll_top = new_viewport.top - new_canvas.top;
        new_scroll_left = new_viewport.left;
        console.log("new_scroll _top = " + new_scroll_top + 
                    ", _left = " + new_scroll_left);

        // Function that changes the svg size (abruptly, no animation)
        var resize_canvas = function(w, h) {
          return function() {
            console.log("Setting canvas size to w = " + w + ", h = " + h);
            svg.style({
              "width": w,
              "height": h,
            });
            // The following lines are an ugly hack that seems to be necessary
            // for webkit browsers, to get them to re-compute the scroll bars
            // for the container div, once the child has resized.
            container_dom.style.display = "none";
            console.log(container_dom.offsetHeight);
            container_dom.style.display = "block";
          };
        }(new_canvas.width(), new_canvas.height());

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

        // scroll_canvas returns a Promise that will scroll the canvas, both
        // vertically and horizontally at the same time.
        var scroll_canvas = function(st, nst, sl, nsl) {
          return function() {
            return new Promise(function(resolve, reject) {
              if (st != nst || sl != nsl) {
                container_d3.transition()
                  .duration(duration)
                  .tween("uniquetweenname1", tweener(nst, nsl))
                  .each("end", function() {
                    resolve("done scroll_canvas to " + nst + ", " + nsl);
                  })
                ;
              }
              else {
                resolve("scroll_canvas: nothing to do");
              }
            });
          };
        }(scroll_top, new_scroll_top, scroll_left, new_scroll_left);

        // Finally ready!
        // If the canvas is getting larger, first change the size abruptly,
        // then tween the scrollbars
        if (new_canvas.width() > canvas.width() || 
            new_canvas.height() > canvas.height()) 
        {
          console.log("embiggen");
          resize_canvas();
          scroll_canvas();
        }

        // If the canvas is getting smaller, first tween, then shrink
        // FIXME: this assumes that there will always be a scroll animation,
        // which isn't always true. If, for example, we're scrolled to the top,
        // and you collapse a node near the bottom, there will be no scroll
        // animation, and the canvas will shrink abruptly. This clips the 
        // nodes at the bottom that are being collapsed. This should be fixed
        // so that we don't resize the canvas until all animations are done.
        else {
          console.log("emsmallen");
          scroll_canvas()
            .then(resize_canvas);
        }

        //----------------------------------------------------------

  return new_canvas;
}