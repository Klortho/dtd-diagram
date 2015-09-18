if (typeof jQuery !== "undefined" &&
    typeof d3 !== "undefined")
{
  DtdDiagram = function($) {
    var document_ready = new Promise(function(resolve) {
      $(document).ready(resolve);
    });

    // Class definition, constructor.
    var DtdDiagram = function(opts) {
      var diagram = this;
      DtdDiagram.diagrams.push(diagram);
      diagram.opts = opts || {};

      // Defer everything else, including options handling, until document
      // ready.
      document_ready.then(function() {
        diagram.draw();
      });
    };

    DtdDiagram.diagrams = [];
    DtdDiagram.auto_start = true;

    // By default, if the user hasn't instantiated an object, then
    // we'll make one for him at document.ready.        
    document_ready.then(function() {
      if (DtdDiagram.auto_start && DtdDiagram.diagrams.length == 0) 
        new DtdDiagram();
    });

    // Default values for all the options. 
    // There are various ways to set the options; in order of 
    // higher-to-lower precedence:
    // - Pass them as an object to the DtdDiagram constructor function.
    // - Set them on the @data-options attribute of the <div>
    //   element. Make sure they are in strictly valid JSON format.
    // - Use the defaults

    var defaults = {
      // DTD JSON file
      dtd_json_file: "dtd.json",

      // Or, use a test file, with the tree hard-coded
      test_file: null,

      // The root element, by default, is read from the DTD file, but can
      // be overridden
      root_element: null,

      tag_doc_url: "doc/#p=",

      // Some dimensions
      node_width: 210,  // nominal width of a column
      node_height: 32,
      choice_seq_node_width: 18,
      q_width: 15,
      diagonal_width: 20,

      // Minimum size of the drawing in terms of tree-node rows and
      // columns. "rows" is a nominal concept. The actual # of nodes 
      // you see vertically depends on spacing between 
      // non-sibs, etc.
      min_num_columns: 4,
      min_num_rows: 10,

      // Dimensions of the rectangles used to draw the nodes
      node_box_height: 25,
      node_expander_width: 10,

      scrollbar_margin: 20,
      dropshadow_margin: 5,

      // Ratio of the separation between groups to the separation between sibling nodes
      group_separation: 1.4,

      // Duration of the animation, in milliseconds.
      duration: 500,
    };

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

    //--------------------------------------------------------------------
    // Node class

    // Construct a Node from the specification within a content-model of some 
    // element within the DTD.  
    // This copies everything except `children`. 
    // Nodes start life "uninitialized", meaning the children have not yet
    // been instantiated.
    var Node = function(diagram, spec, elem_parent) {
      this.initialized = false;
      this.diagram = diagram;
      this.elem_parent = elem_parent;
      for (var k in spec) {
        if (k != "children") {
          this[k] = spec[k];
        }
      }
      // For `choice` and `seq` nodes, the type gets
      // copied from the spec. For `element` nodes, we add the type.
      if (!this["type"]) this["type"] = "element";
    }

    Node.prototype.has_children = function() {
      return this.children || this._children;
    }

    // For element nodes, this creates new child nodes from the content-model, as 
    // needed, filling in the _children array. When this returns, the (element) node 
    // is in the collapsed state.
    // For choice and seq nodes, this recurses, eventually initializing all of the
    // nodes up to the first elements or attributes that it sees.

    Node.prototype.initialize = function() {
      var self = this;

      // Make sure this is only called once
      if (self.initialized) return;
      self.initialized = true;

      if (self.type == "attribute") return;
      if (self.type == "choice" || self.type == "seq") {
        self.children.forEach(function(k) {
          k.initialize();
        });
        return;
      }

      // type is "element"
      var spec = dtd_json.elements[this.name];
      if (typeof spec != "object" || 
          typeof spec["content-model"] == "undefined" ||
          spec["content-model"].length == 0)
      {
        return;
      }

      self._children = [];

      // This recursive function looks at one spec in the content-model of the
      // dtd, and creates Nodes for it.
      function make_kid(kid_spec, parent_array, elem_parent) {
        var kid = new Node(self.diagram, kid_spec, elem_parent);
        parent_array.push(kid);

        if (kid.type == "choice" || kid.type == "seq") {
          kid.children = [];
          kid_spec.children.forEach(function(gk_spec) {
            make_kid(gk_spec, kid.children, elem_parent);
          });
        }
      }

      // Flatten out the top-level - if the only child of a `content-model` is
      // a single `seq`, then those will be the direct children.
      var kid_specs = spec["content-model"];
      if (kid_specs.length == 1 && kid_specs[0]["type"] == "seq") 
        kid_specs = kid_specs[0].children;

      kid_specs.forEach(function(kid_spec) {
        make_kid(kid_spec, self._children, self);
      });
    }

    Node.prototype.extents = function() {
      var opts = this.diagram;
      return new Box(
        this.x - opts.node_box_height / 2,
        this.y,
        this.x + opts.node_box_height / 2,
        this.y + opts.node_width
      );
    }

    // Tree-reduce function: returns the min/max extents
    // of an accumulator (previous extents), a given node (n) and all
    // of that node's kids.
    function _tree_reduce(acc, n) {
      //acc.log("_tree_reduce:acc");
      var ke = (n.children || [])   // kids extents
        .reduce(_tree_reduce, acc);  
      var ne = n.extents();

      var b = d3.max([ke.bottom, ne.bottom]);
      return new Box(
        d3.min([ke.top,    ne.top]),
        d3.min([ke.left,   ne.left]),
        b,
        d3.max([ke.right,  ne.right])
      );
    }

    // Determine the extents of a (sub)tree, returning a Box.
    Node.prototype.tree_extents = function() {
      return (this.children || [])
        .reduce(_tree_reduce, this.extents());
    }

    // This is called when the user clicks on a node in the tree that has
    // kids. We have to call initialize() on each of the *child* nodes,
    // so that we can render them correctly.
    Node.prototype.expand = function() {
      if (this.children == null) {
        this.children = this._children;
        this._children = null;
      }
      // Initialize each of the kids
      if (this.children != null) {
        this.children.forEach(function(k) {
          k.initialize();
        });
      }
    }

    Node.prototype.collapse = function() {
      this._children = this.children;
      this.children = null;
    }


    //--------------------------------------------------------------------
    // Main drawing routine

    DtdDiagram.prototype.draw = function() {
      var diagram = this;
      var opts = diagram.opts;
      diagram.error = false;

      // User can pass in a specifier for the div either as an
      // id string, a DOM Element, or a jQuery object.
      var container = opts.container || 'dtd-diagram';
      var container_jq = diagram.container_jq =
          typeof container == "string" ? $('#' + container) :
          container instanceof Element ? $(container) :
          container;

      // If the expected div is not found, or if the selection somehow
      // matches more than one, then get out now.
      if (container_jq.length != 1) return;

      var tag_options = container_jq.data("options") || {};
      $.extend(true, diagram, defaults, tag_options, opts);

      var container_dom = diagram.container_dom = container_jq[0];
      var container_d3 = diagram.container_d3 = d3.select(container_dom);

      var dtd_json_file = diagram.dtd_json_file;
      var test_file = diagram.test_file;
      var root_element = diagram.root_element;
      var tag_doc_url = diagram.tag_doc_url;

      var node_width = diagram.node_width;
      var node_height = diagram.node_height;
      var choice_seq_node_width = diagram.choice_seq_node_width;
      var q_width = diagram.q_width;
      var min_num_columns = diagram.min_num_columns;
      var min_num_rows = diagram.min_num_rows;
      var node_box_height = diagram.node_box_height;
      var node_expander_width = diagram.node_expander_width;
      var scrollbar_margin = diagram.scrollbar_margin;
      var dropshadow_margin = diagram.dropshadow_margin;
      var group_separation = diagram.group_separation;
      var duration = diagram.duration;

      // Computed values
      var min_canvas_width = node_width * min_num_columns;
      var min_canvas_height = node_height * min_num_rows;

      container_jq.append(
        "<svg>\n" +
        "  <defs>\n" +
        "    <filter id=\"dropshadow\" height=\"130%\">\n" +
        "      <feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"3\"/> \n" +
        "      <feOffset dx=\"2\" dy=\"2\" result=\"offsetblur\"/>\n" +
        "      <feComponentTransfer>\n" +
        "        <feFuncA type=\"linear\" slope=\".5\"/>\n" +
        "      </feComponentTransfer>\n" +
        "      <feMerge> \n" +
        "        <feMergeNode/>\n" +
        "        <feMergeNode in=\"SourceGraphic\"/> \n" +
        "      </feMerge>\n" +
        "    </filter>\n" +
        "  </defs>\n" +
        "</svg>\n"
      );
      var svg = container_d3.select("svg");

      // scrollbar margin - if this is big enough, it ensures we'll never get
      // spurious scrollbars when the drawing is at the minimum size. But if it's
      // too big, it messes up the centering. 22 gives plenty of room
      container_d3.style({
        'width': (min_canvas_width + scrollbar_margin) + 'px',
        'height': (min_canvas_height + scrollbar_margin) + 'px'
      });

      var last_id = 0;

      // Create the tree layout 
      // (https://github.com/mbostock/d3/wiki/Tree-Layout#tree)
      var tree = d3.layout.tree()
        .nodeSize(function(n) { 
          return [node_height, 
            n.type == "element" ? node_width : choice_seq_node_width];
        })
        .separation(function(a, b) {
          var sep = a.elem_parent == b.elem_parent ? 1 : group_separation;
          var alabel = a.name ? a.name : a.type;
          var blabel = b.name ? b.name : b.type;
          console.log("separation: " + alabel + " <=> " + blabel + ": " + sep);
          return sep;
        })
      ;

      // Construct a new diagonal generator. `diagonal` is a new function that 
      // draws the lines between the boxes.
      // See https://github.com/mbostock/d3/wiki/SVG-Shapes#diagonal.
      var diagonal = d3.svg.diagonal()
        .source(function(d, i) {
          var s = d.source;
          return {
            x: s.x, 
            y: s.y + (s.width ? s.width : 0) + 
              (s instanceof Node && s.type == "element" ? 
                node_expander_width : 0),
          };
        })
        .projection(function(d) {
          return [d.y, d.x];
        })
      ;

      var canvas = new Box(
        -min_canvas_height / 2, 
        0, 
        min_canvas_height / 2, 
        min_canvas_width
      );

      svg.attr({
        xmlns: "http://www.w3.org/2000/svg",
        xlink: "http://www.w3.org/1999/xlink",
        "width": canvas.width(),
        "height": canvas.height(),
      });
      var svg_g = svg.append("g")
        .attr({"transform": "translate(0, " + (-canvas.top) + ")"});


      // Read the input file, and kick off the visualization
      var root;

      if (!test_file) {
        d3.json(dtd_json_file, function(error, _dtd_json) {
          if (error) {
            var msg = "Error reading DTD file '" + dtd_json_file + 
                "': " + error.statusText;
            console.error(msg);
            diagram.error = msg;
          }
          else {
            dtd_json = _dtd_json;
            root = new Node(diagram, {
              name: root_element || dtd_json.root,
            }, null);
            root.initialize();
            root.expand();

            // x is the vertical, and y the horizontal, coordinate
            root.x0 = 0;
            root.y0 = 0;

            // Starting state is to have the root and its kids expanded, but all
            // the deeper descendents collapsed.
            update(root);
          }
        });
      }
      else {
        d3.json(test_file, function(error, _test_json) {
          root = bless(_test_json, null);
          root.x0 = 0;
          root.y0 = 0;
          update(root);
        });
      }

      // Used for testing only
      function bless(s, elem_parent) {
        var n = new Node(diagram, s, elem_parent);
        if (s.children) {
          n.children = [];
          var new_elem_parent = n.type == "element" ? n : elem_parent;
          s.children.forEach(function(ks) {
            n.children.push(bless(ks, new_elem_parent));
          });
        }
        return n;
      }
      $("#capture").on("click", function(e) {
        var msg = json_out(root);
        $('#msg').text(msg);
      });
      function json_out(n) {
        var msg = "{"
        if (n.name) msg += '"name": "' + n.name + '",\n';
        msg += '"type": "' + n.type + '"';
        if (n.children) {
          msg += ',\n';
          msg += '"children": [';
          for (var i = 0; i < n.children.length; ++i) {
            msg += json_out(n.children[i]);
            if (i < n.children.length - 1) msg += ",";
          }
          msg += "]\n";
        }
        msg += "}\n";
        return msg;
      }

      // Main function to update the rendering. `source` is the node that was 
      // clicked.
      function update(source) {
        var min_canvas_width = container_jq.width() - scrollbar_margin,
            min_canvas_height = container_jq.height() - scrollbar_margin;

        var myID = 0;

        // Compute the new tree layout.
        var nodes = tree.nodes(root);
        var links = tree.links(nodes);

        // To do auto-resizing of the drawing, and auto-scrolling, here is the
        // algorithm:
        // - find the new drawing size
        // - figure out the new size of the canvas (not always the same)
        // - compute the "cover box", which is the smallest box that the viewport
        //   should cover in the new layout
        // - find out where the viewport is now
        // - figure where to move the viewport to -- the smallest amount that will
        //   cause it to be over the cover box.

        // Determine the new extents of the whole drawing
        var new_drawing = root.tree_extents();
        new_drawing.bottom += dropshadow_margin;
        new_drawing.log("new_drawing");

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
        new_canvas.log("new_canvas");

        // Get the extents of the source (the node the user clicked on) 
        // and its subtree.
        var source_extents = source.extents();
        var stree_extents = source.tree_extents();
        stree_extents.log("stree_extents");

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
        cover_box.log("cover_box");

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
        viewport.log("viewport");

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
        new_viewport.log("new_viewport");

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

        // At the same time, transition the svg coordinates
        svg_g.transition()
          .duration(duration)
          .attr({"transform": "translate(0, " + (-new_canvas.top) + ")"})
        ;

        canvas = new_canvas.copy();

        // Bind the node data. The second argument to .data() provides the key,
        // to ensure that the same data value is bound to the same node every
        // time.
        var node = svg_g.selectAll("g.node")
          .data(nodes, function(d) { 
            return d.id || (d.id = ++last_id); 
          })
        ;

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
          .attr({
            "class": "node",
            transform: function(d) { 
              return "translate(" + source.y0 + "," + source.x0 + ")"; 
            },
            filter: "url(#dropshadow)",
          })
        ;

        var simple_nodes = nodeEnter.filter(function(d) {
          return d.type == "element" || d.type == "attribute";
        });
        simple_nodes.append("rect")
          .attr({
            "class": function(d) {
              return "simple" + (d.has_children() ? " has_children" : "");
            },
            "data-id": function(d) { return d.id },
            width: 0,
            height: node_box_height,
            y: - node_box_height / 2,
            rx: 6,
            ry: 6,
          })
        ;

        // Text label for simple nodes
        // Implement links to documentation here
        simple_nodes.append("a")
          .attr("xlink:href", function(d) {
            return tag_doc_url + "elem-" + d.name;
          })
          .append("text")
            .attr({
              id: function(d) { return d.id; },
              x: function(d) {return 5 + (d.q ? q_width : 0)},
              y: 0,
              "text-anchor": "baseline",
              "alignment-baseline": "middle",
            })
            .text(function(d) { 
              return d.name; 
            })
            .style("fill-opacity", 0)
        ;

        // Expander box for simple nodes that have kids
        simple_nodes.filter(function(d) {
            return d.has_children();
          })
          .append("rect")
            .attr({
              "class": "expander has_children",
              width: 0,
              height: node_box_height,
              "data-id": function(d) { return d.id || d.name },
              y: - node_box_height / 2,
              x: 0,
            })
            .on("click", click)
        ;

        var choice_nodes = nodeEnter.filter(function(d) {
          return d.type == "choice";
        });
        choice_nodes.append("circle")
          .attr({
            'class': 'choice',
            r: choice_seq_node_width/2,
          })
        ;

        var seq_nodes = nodeEnter.filter(function(d) {
          return d.type == "seq";
        })
        seq_nodes.append("rect")
          .attr({
            'class': 'seq',
            width: choice_seq_node_width * 0.8,
            height: choice_seq_node_width * 0.8,
            x: -choice_seq_node_width * 0.4,
            y: -choice_seq_node_width * 0.4,
          })
        ;

        // Text label for `q`
        nodeEnter.filter(function(d) {return !!d.q;})
          .append("text")
            .attr({
              "class": "q",
              x: function(d) {
                return d.type == "element" ? q_width/2 : 0;
              },
              y: 0,
              "text-anchor": function(d) {
                return d.type == "element" ? "start" : "middle";
              },
              "alignment-baseline": "middle",
            })
            .text(function(d) {return d.q;})
        ;

        // Transition all nodes to their new position.
        var nodeUpdate = node.transition()
          .duration(duration)
          .attr("transform", function(d) { 
            return "translate(" + d.y + "," + d.x + ")"; 
          });

        function text_width(d) {
          if (!d.width) {
            var the_text = document.getElementById(d.id);
            d.width = (the_text ? the_text.getBBox()["width"] + 10 : 96) +
                      (d.q ? q_width : 0);
          }
          return d.width;
        }

        nodeUpdate.select("rect.simple")
          .attr("width", function(d) {
            return text_width(d)
          })
          .attr("height", node_box_height)
        ;

        nodeUpdate.select("rect.expander")
          .attr("width", node_expander_width)
          .attr("x", function(d) {
            return text_width(d);
          })
        ;

        nodeUpdate.select("text")
          .style("fill-opacity", 1);


        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
          .duration(duration)
          .attr("transform", function(d) { 
            return "translate(" + source.y + "," + source.x + ")"; 
          })
          .remove();

        nodeExit.select("rect").attr("width", 0);

        nodeExit.select("text")
          .style("fill-opacity", 0);

        nodeExit.select("rect:nth-child(3)")
          .attr("width", 0)
          .attr("x", 0)
        ;

        // Update the links…
        var link = svg_g.selectAll("path.link")
          .data(links, function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
          .attr("class", "link")
          .attr("d", function(d) {
            var o = {x: source.x0, y: source.y0};
            return diagonal({source: o, target: o});
          });

        // Transition links to their new position.
        link.transition()
          .duration(duration)
          .attr("d", diagonal);

        // Transition exiting links to the parent's new position.
        link.exit().transition()
          .duration(duration)
          .attr("d", function(d) {
            var o = {x: source.x, y: source.y};
            return diagonal({source: o, target: o});
          })
          .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
          d.x0 = d.x;
          d.y0 = d.y;
        });
      }

      // Toggle children on click.
      function click(d) {
        if (d.children) {
          d.collapse();
        } 
        else {
          d.expand();
        }
        update(d);
      }
    }

    return DtdDiagram;
  }(jQuery);

}