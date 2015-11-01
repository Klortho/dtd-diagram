// Define a global class DtdDiagram

if (typeof d3 !== "undefined")
{
  (function() {

    DtdDiagram = function(opts) {
      var diagram = this;
      DtdDiagram.diagrams.push(diagram);
      diagram.opts = opts || {};

      // Defer everything else, including options handling, until document
      // ready.
      document_ready
        .then(function() {
          return diagram.initialize();
        })
        .then(function() {
          return diagram.update(diagram.root);
        })
        .catch(function(err) {
          console.error(err.stack);
        })
      ;
    };

    DtdDiagram.diagrams = [];
    DtdDiagram.auto_start = true;

    // document_ready is a Promise that resolves when the document is ready.
    // It simplifies making sure everything is syncronized.
    var document_ready = DtdDiagram.document_ready =
      new Promise(function(resolve) {
        document.addEventListener("DOMContentLoaded", resolve);
      });

    // By default, if the user hasn't instantiated an object, then
    // we'll make one for him at document.ready.        
    document_ready.then(function() {
      if (DtdDiagram.auto_start && DtdDiagram.diagrams.length == 0) 
        new DtdDiagram();
    });

    // Some constants
    var scrollbar_margin = 20;

    // Default values for all the options. 
    // There are various ways to set the options; in order of 
    // higher-to-lower precedence:
    // - Pass them as an object to the DtdDiagram constructor function.
    // - Set them on the @data-options attribute of the <div>
    //   element. Make sure they are in strictly valid JSON format.
    // - Use the defaults
    DtdDiagram.default_options = {

      // DTD JSON file
      dtd_json_file: "dtd.json",

      // The root element, by default, is specified in the DTD JSON file, but can
      // be overridden
      root_element: null,

      // Base URL to use to create links to more documentation.
      tag_doc_base: "doc/#p=",

      // Function to compute the links to documentation. If this returns 
      // null, no link will be generated (by default, that's the case
      // for `other` nodes and mml: elements other than mml:math)
      tag_doc_url: function(node) {
        var t = node.type,
            n = node.name;

        if ( t == "other" ||
             ( t == "element" && n.startsWith("mml:") &&
               n != "mml:math") ) return null;

        return node.diagram.tag_doc_base +
          (t == "attribute" ? "attr-" : "elem-") +
          n.replace(':', '_');
      },

      // Minimum canvas dimensions
      min_canvas_width: 800,
      min_canvas_height: 400,

      // Ratio of the separation between groups to the separation between sibling nodes
      group_separation: 1.4,

      // Duration of the animation, in milliseconds.
      duration: 500,

      // Event callback function for when the user clicks a rebase button.
      // This allows us to update the fragment identifier
      rebase_handler: null,
    };


    // Initialize the diagram, by computing and storing the options, creating
    // the svg element, reading the JSON dtd file, instantiating and configuring 
    // the layout engine. Returns a Promise that resolves after the JSON dtd
    // is read.
    DtdDiagram.prototype.initialize = function() {
      var diagram = this;
      diagram.last_id = 0;

      // User can pass in a specifier for the div either as an
      // id string or a DOM Element
      var opts = diagram.opts,
          container = opts.container || 'dtd-diagram';
      var container_dom = diagram.container_dom =
        typeof container == "string" ? 
          document.getElementById(container) : container;

      if (!container_dom) {
        console.error("Something wrong with the specifier for the diagram's " +
          "DOM element");
        return;
      };

      // A couple of other ways of referencing the container.
      var container_d3 = diagram.container_d3 = d3.select(container_dom);

      // Get the actual options to use, based on the precedence rules. This sets
      // the properties right on the diagram object itself.
      var tag_opts_json = container_dom.getAttribute("data-options");
      var tag_options = tag_opts_json ? JSON.parse(tag_opts_json) : {};
      DtdDiagram.extend(diagram, DtdDiagram.default_options, tag_options, opts);

      // scrollbar margin - if this is big enough, it ensures we'll never get
      // spurious scrollbars when the drawing is at the minimum size. But if it's
      // too big, it messes up the centering. 22 gives plenty of room
      var min_canvas_width = diagram.min_canvas_width,
          min_canvas_height = diagram.min_canvas_height;
      container_d3.style({
        'width': (min_canvas_width + scrollbar_margin) + 'px',
        'height': (min_canvas_height + scrollbar_margin) + 'px'
      });

      // Initialize the SVG
      var svg = diagram.svg = container_d3.append("svg");

      var defs = svg.append("defs");
      defs.append('defs').html(
        '<filter id="dropshadow" height="130%">' +
          '<feGaussianBlur in="SourceAlpha" stdDeviation="3"/>' +
          '<feOffset dx="2" dy="2" result="offsetblur"/>' +
          '<feComponentTransfer>' +
          '  <feFuncA type="linear" slope=".5"/>' +
          '</feComponentTransfer>' +
          '<feMerge>' +
          '  <feMergeNode/>' +
          '  <feMergeNode in="SourceGraphic"/>' +
          '</feMerge>' +
        '</filter>'
      );
      defs.append('defs').html(
        '<linearGradient id="collapsed-linear-gradient">' +
        '  <stop style="stop-color:#787878;stop-opacity:0.39215687;"' +
        '        offset="0"/>' +
        '  <stop style="stop-color:#000000;stop-opacity:0;"' +
        '        offset="1"/>' +
        '</linearGradient>' +
        '<radialGradient' +
        '   xlink:href="#collapsed-linear-gradient"' +
        '   id="collapsed-fill"' +
        '   gradientUnits="userSpaceOnUse"' +
        '   gradientTransform="matrix(0.71138316,-0.67243129,1.0234543,1.0827397,-6.6025303,4.7069303)"' +
        '   cx="10.3125"' +
        '   cy="9.359375"' +
        '   fx="10.3125"' +
        '   fy="9.359375"' +
        '   r="7.5" />'
      );
      defs.append('defs').html(
        '<linearGradient id="expanded-linear-gradient">' +
        '  <stop style="stop-color:#787878;stop-opacity:0.58823532;"' +
        '        offset="0"/>' +
        '  <stop style="stop-color:#000000;stop-opacity:0;"' +
        '        offset="1"/>' +
        '</linearGradient>' +
        '<radialGradient' +
        '   xlink:href="#expanded-linear-gradient"' +
        '   id="expanded-fill"' +
        '   gradientUnits="userSpaceOnUse"' +
        '   gradientTransform="matrix(0.60291662,-0.63555279,0.73595623,0.69816422,-4.6918189,8.0214032)"' +
        '   cx="12.196308"' +
        '   cy="3.283603"' +
        '   fx="12.196308"' +
        '   fy="3.283603"' +
        '   r="7.5" />'
      );
      defs.append('defs').html(
        '<linearGradient id="hover-linear-gradient">' +
        '  <stop style="stop-color:#ffffff;stop-opacity:0.58823532;"' +
        '        offset="0"/>' +
        '  <stop style="stop-color:#000000;stop-opacity:0;"' +
        '        offset="1"/>' +
        '</linearGradient>' +
        '<radialGradient ' +
        '   xlink:href="#hover-linear-gradient"' +
        '   id="hover-gradient"' +
        '   gradientUnits="userSpaceOnUse"' +
        '   gradientTransform="matrix(0.98751557,-0.85565774,1.0673114,1.2317852,-10.470545,8.953672)"' +
        '   cx="12.196308"' +
        '   cy="3.283603"' +
        '   fx="12.196308"' +
        '   fy="3.283603"' +
        '   r="7.5" />'
      );

      var canvas = diagram.canvas = new DtdDiagram.Box(
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
      diagram.svg_g = svg.append("g")
        .attr({"transform": "translate(0, " + (-canvas.top) + ")"});

      // Create the flextree layout engine and set options
      var engine = diagram.engine = d3.layout.flextree()
        .nodeSize(function(d) {
          return [DtdDiagram.Node.node_height, d.y_size()];
        })
        .separation(function(a, b) {
          var sep = a.elem_parent == b.elem_parent 
            ? 1 : diagram.group_separation
          return sep;
        })
      ;

      // Construct a new diagonal generator. `diagonal` is a function that 
      // draws the lines between the boxes.
      // See https://github.com/mbostock/d3/wiki/SVG-Shapes#diagonal.
      var diagonal = diagram.diagonal = d3.svg.diagonal()
        .source(function(d, i) {
          var s = d.source;
          var t = d.target;
          return { 
            x: s.x + 
              ( s.has_content() && d.target.type == "attribute" ? -6 : 
                s.has_attributes() && d.target.type != "attribute" ? 6 : 0), 
            y: s.y + s.width() 
          };
        })
        .projection(function(d) {
          return [d.y, d.x];
        })
      ;

      // Read the input file, and return the promise
      return new Promise(function(resolve, reject) {
        var dtd_json_file = diagram.dtd_json_file;
        d3.json(dtd_json_file, function(error, dtd_json) {
          if (error) {
            reject(new Error("Error reading DTD file '" + dtd_json_file + 
                "': " + error.statusText));
          }
          else {
            diagram.dtd_json = dtd_json;

            // Create the new tree. Unlike all subsequent nodes, the root  
            // is hand-crafted, rather than being copied from an element 
            // spec in the DTD
            try {
              diagram.initialize_root();
              resolve();
            }
            catch(e) {
              reject(e);
            }
          }
        });
      });
    };

    // Helper function, used in two places to create a Node for the
    // root from scratch (from a fake dtd spec).
    DtdDiagram.prototype.initialize_root = function() {
      var diagram = this,
          rname = diagram.root_element;

      if (rname && !diagram.dtd_json.elements[rname]) {
        diagram.root = null;
        throw new Error("Can't find a declaration for element " + rname +
          " in the DTD.");
      }

      var root = diagram.root = DtdDiagram.Node.factory(diagram, {
        name: rname || diagram.dtd_json.root,
        type: 'element',
      }, null);
      diagram.root.x0 = 0;
      diagram.root.y0 = 0;

      // Initial state: root node expanded
      root.expand();
    };

    // Utility function to create a Promise out of a D3 transition. The
    // Promise is resolved when all of the selection's transitions have
    // ended. This was adapted from the code in this mailing list answer:
    // https://groups.google.com/d/msg/d3-js/WC_7Xi6VV50/j1HK0vIWI-EJ
    var transition_promise = DtdDiagram.transition_promise = function(t) {
      var n = 0;
      return new Promise(function(resolve, reject) {
        if (t.empty()) resolve();
        else {
          t.each(function() { ++n; }) 
            .each("end", function() { 
              if (!--n) resolve(); 
            })
          ;
        }
      }); 
    }

    // Rebase the diagram with a new root. The argument can either be 
    // a string (the name of the element) or an ElementNode object, or
    // null.  If it's null, then we'll be rebased to the root specified
    // in the dtd.
    // FIXME: rebasing by string or null is not working.
    DtdDiagram.prototype.rebase = function(n) {
      var diagram = this,
          root;

      if (n == null || typeof n == "string") {
        diagram.root_element = n;
        diagram.initialize_root();
        root = diagram.root;
      }
      else {
        root = diagram.root = n;
        root.redraw = true;
        root.q = null;
        delete root["_width"]; 
      }
      diagram.update(n);
    };

    // Main function to update the rendering. This is called once at the 
    // beginning, and once every time a user clicks a button on a node.
    // `src_node` is the node that was clicked.
    DtdDiagram.prototype.update = function(src_node) {
      var diagram = this;
      diagram.src_node = src_node;

      // Keep a list of all promises (lest we forget)
      var promises = [];

      // Nodes
      // -----

      // Compute the new tree layout
      var engine = diagram.engine;
      var nodes = engine.nodes(diagram.root);

      // Instantiate the SVG <g> for each entering node, and set
      // the nodes_update, nodes_enter, and nodes_exit selections
      DtdDiagram.Node.start_update(diagram, nodes);

      // Draw each new, entering node
      diagram.nodes_enter.each(function(n) {
        n.draw_enter(this);
      });

      // Transition all nodes to their new positions and full sizes
      diagram.nodes_update.each(function(n) {
        promises.push(n.transition_update());
      });

      // Transition exiting nodes to the parent's new position, and
      // zero size.
      diagram.nodes_exit.each(function(n) {
        promises.push(n.transition_exit());
      });


      // Links (diagonals)
      // -----------------

      var links = engine.links(nodes);

      // Bind the links to the SVG paths
      var links_selection = diagram.svg_g.selectAll("path.link")
        .data(links, function(d) { return d.target.id; });

      // Enter any new links at the parent's previous position.
      var fake_node = {
        x: src_node.x0, 
        y: src_node.y0, 
        width: function() { return 0; },
        has_content: function() { return false; },
        has_attributes: function() { return false; },
      };
      var diagonal = diagram.diagonal;
      links_selection.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
          return diagonal({source: fake_node, target: fake_node});
        });

      // Transition links to their new position.
      var duration = diagram.duration;
      promises.push(transition_promise(
        links_selection.transition()
          .duration(duration)
          .attr("d", diagonal)
      ));

      // Transition exiting links to the parent's new positions.
      promises.push(transition_promise(
        links_selection.exit().transition()
          .duration(duration)
          .attr("d", function(d) {
            return diagonal({source: fake_node, target: fake_node});
          })
          .remove()
      ));


      // Canvas / scrollbars
      // -------------------

      // Transition scrollbars and drawing size
      var Canvas = DtdDiagram.Canvas;
      promises.push(DtdDiagram.Canvas.scroll_resize(diagram));
      diagram.canvas = diagram.new_canvas.copy();

      Promise.all(promises).then(
        function(msg) {
          //console.log("Transitions complete: " + msg);
          Canvas.finish(diagram);
        },
        function(msg) {
          console.error("Problem during transistions: " + msg.stack);
        }
      );

      // Stash the old positions for transition.
      nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    };

    // Simple extend utility function
    DtdDiagram.extend = function() {
      var target = arguments[0];
      for (var i = 1; i < arguments.length; ++i) {
        var obj = arguments[i];
        for (var key in obj)
          if (obj.hasOwnProperty(key)) target[key] = obj[key];
      }
      return target;
    };
  })();
}
// DtdDiagram.Box class.
// Holds coordinates for top, left, bottom, and right. Has methods for
// moving the box, vertically or horizontally.

if (typeof DtdDiagram != "undefined") {
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
}

// DtdDiagram.Node class

if (typeof DtdDiagram != "undefined") {
  (function() {

    var Node = DtdDiagram.Node = {
      // Some constants used in drawing
      node_height: 32,
      node_box_height: 25,
      diagonal_width: 20,
      node_text_margin: 10,
    };

    // Registry of subclass constructors
    var subclasses = {};
    Node.register = function(type, cls) {
      subclasses[type] = cls;
    }

    // The factory constructs a Node from a specification within a content section
    // of some element within the DTD. This uses the type registry to call the 
    // subclass constructors.

    Node.factory = function(diagram, spec, elem_parent) {
      if (!spec.type) {
        console.error("Invalid DTD, every node specifier must have a type");
        return null;
      }
      var subclass = subclasses[spec.type];
      if (!subclass) {
        console.error("Invalid DTD, node type not recognized: " + spec.type);
        return null;
      }

      var n = new subclass();

      // Copy *name*, *type*, and *q*, but not *children*.
      n.diagram = diagram;
      n.spec = spec;
      n.elem_parent = elem_parent;
      n.children = [];
      for (var k in spec) {
        if (k != "children") {
          n[k] = spec[k];
        }
      }

      n.initialize();
      return n;
    };

    // Some functions to help draw SVG paths
    Node.path = function() {
      var p = "";
      for (var i = 0; i < arguments.length; ++i) {
        p += arguments[i] + " ";
      }
      return p;
    }
    // lineto by distance and angle
    Node.la = function(d, a) {
      return "l " + (d * Math.cos(a)) + "," + (d * Math.sin(a)) + " ";
    };
    // circular arc, always drawn clockwise
    Node.arc = function(r, x, y, large_arc) {
      if (typeof large_arc == "undefined") large_arc = 0;
      return "a " + r + "," + r + " 0," + large_arc + ",1 " + x + "," + y + " ";
    };

    // Start the update, after the user has clicked on a button. First thing is
    // to bind the data - the list of Node
    // objects in the tree bound to their `g.node` SVG elements;
    // then create update, enter, and exit selections and store
    // those in diagram.
    Node.start_update = function(diagram, nodes) {
      var src_node = diagram.src_node;

      var nodes_update = diagram.nodes_update = 
        diagram.svg_g.selectAll("g.node")
          .data(nodes, function(d) { 
            return d.id || (d.id = ++diagram.last_id); 
          })
        ;

      // The x,y location <g> of entering nodes all start the animation
      // at the src_node
      var nodes_enter = diagram.nodes_enter = 
        nodes_update.enter().append("g")
          .attr({
            "class": function(d) {
              return "node " + d.type;
            },
            filter: "url(#dropshadow)",
            transform: "translate(" + src_node.y0 + "," + src_node.x0 + ") " +
                       "scale(0.001, 0.001)",
          })
        ;

      // For entering Nodes, initialize gs, which is the D3 selection for
      // the <g> container element
      nodes_enter.each(function(d) {
        d.gs = d3.select(this);
      });

      diagram.nodes_exit = nodes_update.exit();
    };


    // Some private utility functions

    function merge_array(target, source) {
      for (var i = 0; i < source.length; ++i) 
        target.push(source[i]);
    }

    // Tree-reduce function: returns the min/max extents
    // of an accumulator (previous extents), a given node (n) and all
    // of that node's kids.
    function _tree_reduce(acc, n) {
      //acc.log("_tree_reduce:acc");
      var ke = (n.children || [])   // kids extents
        .reduce(_tree_reduce, acc);  
      var ne = n.extents();

      return new DtdDiagram.Box(
        d3.min([ke.top,    ne.top]),
        d3.min([ke.left,   ne.left]),
        d3.max([ke.bottom, ne.bottom]),
        d3.max([ke.right,  ne.right])
      );
    }

    ////////////////////////////////////////////////
    // Object methods

    Node.methods = {

      initialize: function() {},

      has_content: function() {
        return false;
      },

      has_attributes: function() {
        return false;
      },

      has_q: function() {
        return false;
      },

      q_width: function() {
        return 0;
      },

      get_content: function() {
        return [];
      },

      // Get all the element descendants of this node

      elem_descendants: function() {
        var d = [];
        this.get_content().forEach(function(k) {
          if (k.type == "element") {
            d.push(k);
          }
          else if (k.type == "choice" || k.type == "seq") {
            merge_array(d, k.elem_descendants());
          }
        });
        return d;
      },

      // Geometry / layout related
      // -------------------------

      extents: function() {
        var diagram = this.diagram;
        return new DtdDiagram.Box(
          this.x - Node.node_box_height / 2,
          this.y,
          this.x + Node.node_box_height / 2,
          this.y + this.width()
        );
      },

      // Determine the extents of a (sub)tree, returning a Box object.
      tree_extents: function() {
        return (this.children || [])
          .reduce(_tree_reduce, this.extents());
      },

      // D3/SVG drawing
      // --------------

      // Get a Node's y_size, which is used by the layout engine. This is really
      // it's total width (the d3.flextree layout uses x for vertical and y for
      // horizontal).
      y_size: function() {
        return this.width() + Node.diagonal_width;
      },

      // Cache node widths. The actual values are computed in subclass methods
      // compute_width().
      width: function() {
        if (!("_width" in this)) {
          this._width = this.compute_width();
        }
        return this._width;
      },

      // Transition an (updating or entering) node to its new position and 
      // full-sized scale
      transition_update: function() {
        var self = this;
        return DtdDiagram.transition_promise(
          self.gs.transition()
            .duration(self.diagram.duration)
            .attr("transform", 
              "translate(" + self.y + "," + self.x + ") " +
              "scale(1, 1)"
            )
        );
      },

      // Transition exiting nodes to their parents' positions and zero size,
      // then remove them.
      transition_exit: function() {
        var self = this
            src_node = self.diagram.src_node;

        return DtdDiagram.transition_promise(
          self.gs.transition()
            .duration(self.diagram.duration)
            .attr("transform", function(d) { 
              return "translate(" + src_node.y + "," + src_node.x + ") " +
                     "scale(0.001, 0.001)"; 
            })
            .remove()
        );
      },
    };

  })();
}


// DtdDiagram.HasLabelNode mixin

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node;

    // These methods are mixed in with the inheriting class' prototype
    DtdDiagram.HasLabelNode = {

      // Draw an entering label. 
      draw_enter_label: function() {
        var self = this,
            diagram = self.diagram;

        var doc_url = diagram.tag_doc_url(self);

        // Draw the text. If it's an attribute or element node, make
        // it a hyperlink
        var container = self.gs;
        if (doc_url)
          container = self.gs.append("a")
            .attr("xlink:href", doc_url);

        container.append("text")
          .attr({
            id: self.id,
            "class": "label",
            x: Node.node_text_margin + self.q_width(),
            y: 0,
            "text-anchor": "baseline",
            "alignment-baseline": "middle",
          })
          .text(self.name)
        ;
      },

      // Get the displayed width for a label string. This generates a temporary
      // SVG text node, measures its width, and then destroys it. It caches
      // the results in diagram.label_width_cache.
      // Return value includes 2*node_text_margin.
      label_width: function() {
        var self = this,
            diagram = self.diagram,
            label = self.name;

        if (!("label_width_cache" in diagram)) {
          diagram.label_width_cache = {};
        }
        var cache = diagram.label_width_cache;
        if (!(label in cache)) {
          var text = diagram.svg_g
            .append("text")
              .attr({
                "id": "temporary-label",
                "class": "label",
                x: 0,
                y: 0,
              })
              .text(label)
              .style("fill-opacity", 0)
          ;
          cache[label] = 2 * Node.node_text_margin +
            document.getElementById("temporary-label").getBBox()["width"];
          text.remove();
        }
        return cache[label];
      },

      compute_width: function() {
          return this.label_width();
      },
    };
  })();
}    



// DtdDiagram.HasQNode mixin

if (typeof DtdDiagram != "undefined") {
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
}    



// DtdDiagram.ElementNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        HasLabelNode = DtdDiagram.HasLabelNode,
        HasQNode = DtdDiagram.HasQNode,
        button_width = 15;

    // Constructor.
    var ElementNode = DtdDiagram.ElementNode = function() {};

    // Register this type
    Node.register("element", ElementNode);

    // Class methods

    ElementNode.content_click_handler = function(n) {
      n.toggle_content();
      n.diagram.update(n);
    };

    ElementNode.attributes_click_handler = function(n) {
      n.toggle_attributes();
      n.diagram.update(n);
    };

    ElementNode.rebase_click_handler = function(n) {
      if (typeof n.diagram.rebase_handler == "function")
        n.diagram.rebase_handler(n);
      
      // If it's totally collapsed, go ahead and expand it
      if (!n.content_expanded && !n.attributes_expanded) {
        n.expand_content();
        n.expand_attributes();
      }
      n.diagram.rebase(n);
    }

    // Object methods

    DtdDiagram.extend(
      ElementNode.prototype, 
      Node.methods,
      HasLabelNode,
      HasQNode,
      {
        initialize: function() {
          var self = this,
              diagram = self.diagram;
          HasQNode.initialize.call(self);

          self.content = null;
          self.content_expanded = false;
          self.attributes_expanded = false;

          // Initialize attributes now
          var decl = self.declaration = diagram.dtd_json.elements[self.name];
          if (typeof decl != "object") {
            console.error("Can't find a declaration for element " + self.name +
              " in the DTD.");
            decl = self.declaration = null;
          }
          var attrs = self.attributes = [];
          if (decl && decl.attributes) {
            decl.attributes.forEach(function(attr_spec) {
              attrs.push(Node.factory(diagram, attr_spec, self));
            });
          }
        },

        // Called the first time we need to discover the content children
        // for an ElementNode.
        init_content: function() {
          var self = this,
              diagram = self.diagram,
              decl = self.declaration;

          var content = self.content = [];
          if (decl && decl.content && decl.content.children) {
            decl.content.children.forEach(function(kid_spec) {
              content.push(Node.factory(diagram, kid_spec, self));
            });
          }
        },

        // Get the array of content children (as opposed to attribute children)
        // or the empty array, if there are none.
        get_content: function() {
          if (this.content == null) this.init_content();
          return this.content;
        },

        // Returns true if there are any content children 
        // (as opposed to attributes). 
        has_content: function() {
          if (this.content == null) this.init_content();
          return this.content.length > 0;
        },

        // Returns true if this Node has any attribute children.
        has_attributes: function() {
          return this.attributes.length > 0;
        },

        // Event handlers
        // --------------

        toggle_content: function() {
          this.content_expanded = !this.content_expanded;
          this.set_children();
        },

        expand_content: function() {
          this.content_expanded = true;
          this.set_children();
        },


        toggle_attributes: function() {
          this.attributes_expanded = !this.attributes_expanded;
          this.set_children();
        },

        expand_attributes: function() {
          this.attributes_expanded = true;
          this.set_children();
        },

        expand: function() {
          this.content_expanded = this.attributes_expanded = true;
          this.set_children();
        },

        set_children: function() {
          var cexp = this.content_expanded,
              aexp = this.attributes_expanded;

          if (!cexp && !aexp) {
            this.children = [];
          }
          else if (!cexp && aexp) {
            this.children = this.attributes;
          }
          else if (cexp && !aexp) {
            this.children = this.get_content();
          }
          else {
            this.children = this.attributes.concat(this.get_content());
          }

          if (this.gs) {
            this.gs.select('.cb rect').attr("class", 
              cexp ? "expanded" : "collapsed");
            this.gs.select('.ab rect').attr("class", 
              aexp ? "expanded" : "collapsed");
          }
        },

        // Drawing
        // -------

        compute_width: function() {
          return this.q_width() +
              (this.has_content() || this.has_attributes() 
                ? button_width : 0) +
              this.label_width();
        },

        // Draw the initial state of the node box, label, etc.
        draw_enter: function() {
          var self = this,
              diagram = self.diagram,
              gs = self.gs,
              node_box_height = Node.node_box_height;

          // Draw the box.
          gs.append("rect")
            .attr({
              "data-id": self.id,
              "class": "box",
              width: self.width(),
              height: node_box_height,
              y: -node_box_height / 2,
              rx: 6,
              ry: 6,
            })
          ;

          self.draw_enter_label();
          self.draw_enter_q(Node.node_text_margin);

          // content expand button
          if (self.has_content()) {
            self.draw_button("cb",
              self.has_attributes() ? node_box_height / 4 - 0.5 : 0,
              ElementNode.content_click_handler);
          }

          // attributes expand button
          if (self.has_attributes()) {
            self.draw_button("ab",
              self.has_content() ? -node_box_height / 4 + 0.5 : 0,
              ElementNode.attributes_click_handler);
          }

          // rebase button
          var button_g = gs.append("g")
            .attr({
              "class": "button rebase",
              "transform": "translate(2, -16)",
            });
          button_g.append("rect")
            .attr({
              'class': "collapsed",
              width: 10,
              height: 5,
              x: 0,
              y: 0,
              rx: 2.5,
              ry: 2.5,
              transform: "translate(0,5)",
            })
            .on('click', ElementNode.rebase_click_handler);
        },

        // Helper to draw a single content or attributes expander button
        // `button_type` is either "cb" or "ab".
        draw_button: function(button_type, y, handler) {
          var self = this,
              diagram = self.diagram,
              gs = self.gs,
              node_box_height = Node.node_box_height,
              width = self.width();

          var button_g = gs.append("g")
            .attr({
              "class": "button " + button_type,
              "transform": "translate(" + (width - button_width - 2) + 
                           "," + (y + node_box_height / 4 - 16.2) + ")",
            });

          var expanded = button_type == 'cb' ?
            self.content_expanded : self.attributes_expanded;
          var cls = expanded ? "expanded" : "collapsed";
          button_g.append("rect")
            .attr({
              'class': cls,
              width: 15,
              height: 10,
              x: 0,
              y: 0,
              rx: 5,
              ry: 5,
              transform: "translate(0,5)",
            })
            .on('click', handler);

          // Draw the button label - either "< >" or "@"
          if (button_type == "cb") {
            button_g.append('g')
              .attr("transform", "translate(-0.56249982,0)")
              .attr("pointer-events", "none")
              .html(
                '<g transform="matrix(0.93056698,0,0,1.2232143,-0.79346636,-1.1542969)">' +
                '  <path d="m 2.5245,8.71325 6.076,-2.842 0,1.022 -4.97,2.268 4.956,2.268 0.014,1.022 -6.076,-2.842 0,-0.896" />' +
                '</g>' +
                '<g transform="matrix(-0.93056698,0,0,1.2232143,16.918466,-1.1542969)">' +
                '  <path d="m 2.5245,8.71325 6.076,-2.842 0,1.022 -4.97,2.268 4.956,2.268 0.014,1.022 -6.076,-2.842 0,-0.896"/>' +
                '</g>'
              );
          }
          else {
            button_g.append('path')
              .attr("pointer-events", "none")
              .attr('d', "m 8.136125,11.77975 c -5.6e-6,-0.07466 0.00466,-0.139997 0.014,-0.196 -0.3546719,0.550669 -0.9006713,0.826002 -1.638,0.826 -0.4480035,2e-6 -0.8120031,-0.149331 -1.092,-0.448 -0.2706692,-0.307997 -0.4060024,-0.704663 -0.406,-1.19 -2.4e-6,-0.8493287 0.3079973,-1.5959946 0.924,-2.24 0.615996,-0.6533266 1.3299953,-0.979993 2.142,-0.98 0.186661,7e-6 0.3919941,0.028007 0.616,0.084 l 0.28,0.07 c 0.037327,0.018674 0.083994,0.028007 0.14,0.028 0.04666,6.9e-6 0.1259933,-0.023326 0.238,-0.07 0.1493264,-0.065326 0.2566596,-0.097993 0.322,-0.098 0.1399928,7e-6 0.2099927,0.060674 0.21,0.182 -7.3e-6,0.028007 -0.00934,0.07934 -0.028,0.154 l -0.07,0.266 -0.798,2.982 c -0.028006,0.112003 -0.042006,0.20067 -0.042,0.266 -6.4e-6,0.168003 0.08866,0.252003 0.266,0.252 0.3453264,3e-6 0.667326,-0.223997 0.966,-0.672 0.419992,-0.625329 0.629992,-1.3486617 0.63,-2.17 -8e-6,-0.7746601 -0.256675,-1.4186595 -0.77,-1.932 -0.504007,-0.5133251 -1.1433397,-0.7699915 -1.918,-0.77 -1.0920045,8.5e-6 -2.0440035,0.4386747 -2.856,1.316 -0.8026686,0.8680063 -1.2040015,1.8900053 -1.204,3.066 -1.5e-6,0.91467 0.2939982,1.680002 0.882,2.296 0.587997,0.606668 1.3253296,0.910001 2.212,0.91 0.5226616,10e-7 0.9519945,-0.06067 1.288,-0.182 0.3453271,-0.130665 0.77466,-0.382665 1.288,-0.756 0.1866593,-0.139998 0.340659,-0.209998 0.462,-0.21 0.177326,2e-6 0.265992,0.084 0.266,0.252 -8e-6,0.177335 -0.121341,0.359335 -0.364,0.546 -0.9240066,0.728001 -1.9413389,1.092 -3.052,1.092 -1.1293367,0 -2.0720024,-0.373333 -2.828,-1.12 -0.7466676,-0.755998 -1.1200005,-1.698664 -1.12,-2.828 -5e-7,-1.3626612 0.503999,-2.5479934 1.512,-3.556 1.0173303,-1.0173247 2.2166624,-1.5259908 3.598,-1.526 1.0453267,9.2e-6 1.894659,0.3080089 2.548,0.924 0.662658,0.6160076 0.993991,1.4186735 0.994,2.408 -9e-6,1.1106714 -0.406009,2.081337 -1.218,2.912 -0.494674,0.504002 -1.0126736,0.756002 -1.554,0.756 -0.2426728,2e-6 -0.4433393,-0.06066 -0.602,-0.182 -0.1586723,-0.121331 -0.2380056,-0.275331 -0.238,-0.462 m 0.294,-1.904 0.378,-1.4 c -0.2800059,-0.1399937 -0.5506723,-0.2099937 -0.812,-0.21 -0.5413382,6.3e-6 -1.0173377,0.2380061 -1.428,0.714 -0.4013369,0.4760051 -0.6020034,1.031338 -0.602,1.666 -3.4e-6,0.644003 0.2799963,0.966003 0.84,0.966 0.7746617,3e-6 1.3159945,-0.578663 1.624,-1.736")
          }
        },

        // Override the update transition function here, because in the case
        // where we're rebasing, the `q` gets deleted, and we need to redraw
        // the button
        transition_update: function() {
          if (this.redraw) {
            this.gs.html("");
            this.draw_enter();
            this.redraw = false;
          }
          Node.methods.transition_update.call(this);
        },

      }
    );
  })();
}


// DtdDiagram.AttributeNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        attribute_box_height = 21;

    // Constructor
    var AttributeNode = DtdDiagram.AttributeNode = function() {};

    // Register this type
    Node.register("attribute", AttributeNode);

    // Object methods
    DtdDiagram.extend(
      AttributeNode.prototype, 
      Node.methods,
      DtdDiagram.HasLabelNode,
      {
        draw_enter: function() {
          var self = this;

          // Draw the box.
          self.gs.append("ellipse")
            .attr({
              "data-id": self.id,
              "class": "box",
              cx: self.width() / 2,
              cy: 0,
              rx: self.width() / 2,
              ry: attribute_box_height / 2,
            })
          ;
          self.draw_enter_label();
        },
      }
    );
  })();
}


// DtdDiagram.ChoiceNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        HasQNode = DtdDiagram.HasQNode,
        w = 20,
        points = "0,0 " + (w/2) + "," + (-w/2) + " " + w + ",0 " +
          (w/2) + "," + (w/2);

    // Constructor. 
    var ChoiceNode = DtdDiagram.ChoiceNode = function() {};

    // Register this type
    Node.register("choice", ChoiceNode);

    // Object methods
    DtdDiagram.extend(
      ChoiceNode.prototype, 
      Node.methods,
      HasQNode,
      {
        initialize: function() {
          var self = this;
          HasQNode.initialize.call(self);

          (self.spec.children || []).forEach(function(kid_spec) {
            self.children.push(Node.factory(self.diagram, kid_spec, self.elem_parent));
          });
        },

        width: function() { return w; },

        // Draw entering nodes
        draw_enter: function() {
          this.gs.append("polygon")
            .attr({
              'class': 'choice',
              'points': points,
            })
          ;
          this.draw_enter_q(w/2);
        },
      }
    );

  })();
}


// DtdDiagram.SeqNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        HasQNode = DtdDiagram.HasQNode,
        path = Node.path,
        arc = Node.arc,
        w = 13,
        s = 8;

    var p = path("M", 0, s/2, "v", -s) +
               arc(w/2, w, 0) +
               path("v", s) + 
               arc(w/2, -w, 0) + "z";

    // Constructor.
    var SeqNode = DtdDiagram.SeqNode = function() {};

    // Register this type
    Node.register("seq", SeqNode);

    // Object methods
    DtdDiagram.extend(
      SeqNode.prototype, 
      Node.methods,
      HasQNode,
      {
        initialize: function() {
          var self = this;
          HasQNode.initialize.call(self);
          (self.spec.children || []).forEach(function(kid_spec) {
            self.children.push(Node.factory(self.diagram, kid_spec, self.elem_parent));
          });
        },

        width: function() {
          return w;
        },

        // Draw entering nodes
        draw_enter: function() {
          this.gs.append("path")
            .attr({
              'class': 'seq',
              'd': p,
            })
          ;
          this.draw_enter_q(w/2);
        },
      }
    );
  })();
}


// DtdDiagram.OtherNode class

if (typeof DtdDiagram != "undefined") {
  (function() {
    var Node = DtdDiagram.Node,
        other_box_height = 18;

    // Constructor
    var OtherNode = DtdDiagram.OtherNode = function() {};

    // Register this type
    Node.register("other", OtherNode);

    // Object methods
    DtdDiagram.extend(
      OtherNode.prototype, 
      Node.methods,
      DtdDiagram.HasLabelNode,
      {
        draw_enter: function() {
          var self = this;

          // Draw the box.
          self.gs.append("g")
            .attr("transform", "skewX(-15)")
            .append("rect")
              .attr({
                "data-id": self.id,
                "class": "box",
                width: self.width(),
                height: other_box_height,
                y: - other_box_height / 2,
                rx: 3,
                ry: 3,
              })
          ;
          self.draw_enter_label();
        },
      }
    );
  })();
}


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

if (typeof DtdDiagram != "undefined") {
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
          root = diagram.root,
          min_canvas_height = diagram.min_canvas_height,
          min_canvas_width = diagram.min_canvas_width,
          src_node = diagram.src_node,
          canvas = diagram.canvas;

      // Determine the new extents of the whole drawing -- this is a Box object.
      var new_drawing = diagram.new_drawing = root.tree_extents();
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
}

