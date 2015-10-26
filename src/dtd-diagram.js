if (typeof jQuery !== "undefined" &&
    typeof d3 !== "undefined")
{
  // Define a global variable DtdDiagram, which is a function that can be called
  // with `new`.
  DtdDiagram = function($) {

    // Define the constructor function itself, that will be returned at the end of
    // this IFFE, and become the value of the global variable DtdDiagram.
    var _DtdDiagram = function(opts) {
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
          console.error(err);
        })
      ;
    };

    _DtdDiagram.diagrams = [];
    _DtdDiagram.auto_start = true;

    // document_ready is a Promise that resolves when the document is ready.
    // It simplifies making sure everything is syncronized.
    var document_ready = _DtdDiagram.document_ready =
      new Promise(function(resolve) {
        $(document).ready(resolve);
      });

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
    _DtdDiagram.default_options = {
      // DTD JSON file
      dtd_json_file: "dtd.json",

      // Or, use a test file, with the tree hard-coded
      test_file: null,

      // The root element, by default, is specified in the DTD JSON file, but can
      // be overridden
      root_element: null,

      // Base URL to use to create links to more documentation.
      // FIXME: turn this into a URL template.
      tag_doc_url: "doc/#p=",

      // Some dimensions
      min_canvas_width: 800,
      min_canvas_height: 500,
      node_text_margin: 10,     // horizontal margin, on both sides
      node_height: 32,
      node_box_height: 25,
      choice_node_width: 24,
      seq_node_width: 14,
      q_width: 15,
      button_width: 15,
      diagonal_width: 20,
      scrollbar_margin: 20,
      dropshadow_margin: 5,

      // Ratio of the separation between groups to the separation between sibling nodes
      group_separation: 1.4,

      // Duration of the animation, in milliseconds.
      duration: 500,
    };


    // Initialize the diagram, by computing and storing the options, creating
    // the svg element, instantiating and configuring the layout engine
    _DtdDiagram.prototype.initialize = function() {
      var diagram = this;
      diagram.error = false;
      diagram.last_id = 0;

      // User can pass in a specifier for the div either as an
      // id string, a DOM Element, or a jQuery object.
      var opts = diagram.opts,
          container = opts.container || 'dtd-diagram',
          container_jq = diagram.container_jq =
            typeof container == "string" ? $('#' + container) :
            container instanceof Element ? $(container) :
            container;

      // If the expected div is not found, or if the selection somehow
      // matches more than one, then get out now.
      if (container_jq.length != 1) {
        diagram.error = "Something wrong with the specifier for the diagram's " +
          "DOM element";
        return;
      };

      // A couple of other ways of referencing the container.
      var container_dom = diagram.container_dom = container_jq[0];
      var container_d3 = diagram.container_d3 = d3.select(container_dom);

      // Get the actual options to use, based on the precedence rules. This sets
      // the properties right on the diagram object itself.
      var tag_options = container_jq.data("options") || {};
      $.extend(true, diagram, DtdDiagram.default_options, tag_options, opts);

      // If we're using a test file, then we're not going to use a dtd file
      if (diagram.test_file) diagram.dtd_json_file = null;

      // Use jQuery to add the main SVG element that will hold the diagram.
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
      var svg = diagram.svg = container_d3.select("svg");

      // scrollbar margin - if this is big enough, it ensures we'll never get
      // spurious scrollbars when the drawing is at the minimum size. But if it's
      // too big, it messes up the centering. 22 gives plenty of room
      var min_canvas_width = diagram.min_canvas_width,
          min_canvas_height = diagram.min_canvas_height,
          scrollbar_margin = diagram.scrollbar_margin;
      container_d3.style({
        'width': (min_canvas_width + scrollbar_margin) + 'px',
        'height': (min_canvas_height + scrollbar_margin) + 'px'
      });

      // Initialize the SVG
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
      var svg_g = diagram.svg_g = svg.append("g")
        .attr({"transform": "translate(0, " + (-canvas.top) + ")"});

      // Create the flextree layout and set options
      var engine = diagram.engine = d3.layout.flextree()
        .nodeSize(function(d) {
          return [d.x_size, d.y_size];
        })
        .separation(function(a, b) {
          var sep = a.elem_parent == b.elem_parent 
            ? 1 : diagram.group_separation
          //console.log("In separation, returning " + sep);
          return sep;
        })
      ;

      // Construct a new diagonal generator. `diagonal` is a function that 
      // draws the lines between the boxes.
      // See https://github.com/mbostock/d3/wiki/SVG-Shapes#diagonal.
      var diagonal = diagram.diagonal = d3.svg.diagonal()
        .source(function(d, i) {
          var s = d.source;
          return { x: s.x, y: s.y + s.width };
        })
        .projection(function(d) {
          //console.log("diagonal returning [" + d.y + "," + d.x + "]");
          return [d.y, d.x];
        })
      ;

      // Read the input file, and return the promise
      return new Promise(function(resolve, reject) {
        var dtd_json_file = diagram.dtd_json_file;
        d3.json(dtd_json_file, function(error, dtd_json) {
          if (error) {
            var msg = "Error reading DTD file '" + dtd_json_file + 
                "': " + error.statusText;
            console.error(msg);
            diagram.error = msg;
            reject(msg);
          }
          else {
            diagram.dtd_json = dtd_json;

            // Create the new tree. Unlike all subsequent nodes, the root  
            // is hand-crafted, rather than being copied from an element 
            // spec in the DTD
            var root = diagram.root = DtdDiagram.Node.factory(diagram, {
              name: diagram.root_element || dtd_json.root,
              type: 'element',
            }, null);

            // Initial state: root node expanded
            root.expand();
            resolve();
          }
        });
      })
        .then(function() {
          // x is the vertical, and y the horizontal, coordinate
          diagram.root.x0 = 0;
          diagram.root.y0 = 0;
          return diagram;
        })
      ;
    };

    // Utility function to create a Promise out of a D3 transition. The
    // Promise is resolved when all of the selection's transitions have
    // ended. This was adapted from the code in this mailing list answer:
    // https://groups.google.com/d/msg/d3-js/WC_7Xi6VV50/j1HK0vIWI-EJ
    function transition_promise(t) {
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

    // Main function to update the rendering. This is called once at the 
    // beginning, and once every time a user clicks a button on a node.
    // `src_node` is the node that was clicked.
    _DtdDiagram.prototype.update = function(src_node) {
      var diagram = this;
      diagram.src_node = src_node;

      // Since the node widths depend on the widths of the text inside each
      // node, and those widths are used in the laying out of the tree, we
      // have to bind the data and create the text nodes first.

      // This gives us the complete array of nodes
      var root = diagram.root,
          nodes = d3.layout.hierarchy()(root);

      // Bind the data. The second argument to .data() provides the key,
      // to ensure that the same data value is bound to the same node every
      // time.
      var svg_g = diagram.svg_g;
      var nodes_update = svg_g.selectAll("g.node")
        .data(nodes, function(d) { 
          return d.id || (d.id = ++diagram.last_id); 
        })
      ;

      // Keep a list of all promises
      var promises = [];

      // Drawing work: see the README file, under "The update() method", for
      // the list of tasks.

      // 1A - Create the <g> containers
      var nodes_enter = nodes_update.enter().append("g")
        .attr({
          "class": "node",
          filter: "url(#dropshadow)",
          transform: function(d) { 
            return "translate(" + src_node.y0 + "," + src_node.x0 + ")"; 
          },
        })
      ;

      nodes_enter.each(function(d, i) {
        d.draw_enter(this);
      });


      // 1B - Draw the nodes with pre-transition positions and attributes.

      // element and attribute nodes
      var elem_attr_nodes = nodes_enter.filter(function(d) {
        return d.type == "element" || d.type == "attribute";
      });

      // draw the main rectangle
      var node_box_height = diagram.node_box_height;

      // 1C - precompute some node sizes, and attach them to the Node objects.
      // Note that this has to come after the text is drawn.
      var node_text_margin = diagram.node_text_margin,
          diagonal_width = diagram.diagonal_width,
          q_width = diagram.q_width,
          button_width = diagram.button_width;
      nodes_enter.each(function(d) {
        d.x_size = diagram.node_height;
        if (d.type == 'element' || d.type == 'attribute') {
          d.width = node_text_margin * 2 + 
                    (d.q ? q_width : 0) +
                    (d.has_content() || d.has_attributes() 
                      ? button_width : 0) +
                    document.getElementById(d.id).getBBox()["width"];
        }
        else if (d.type == 'choice') {
          d.width = diagram.choice_node_width;
        }
        else {
          d.width = diagram.seq_node_width;
        }
        d.y_size = d.width + diagonal_width;
      });

      // Button for nodes that have kids
      var has_kids_nodes = elem_attr_nodes.filter(function(d) {
        return d.has_content();
      });
      has_kids_nodes.append("text")
        .attr({
          "class": "button-text elem-button",
          x: 0,
          y: 0,
          "text-anchor": "baseline",
          "alignment-baseline": "middle",
        })
        .text('< >')
        .style("fill-opacity", 0)
      ;
      has_kids_nodes.append("rect")
        .attr({
          "data-id": function(d) { return d.id; },
          "class": "button",
          width: button_width,
          height: node_box_height / 2,
          x: function(d) { return d.width - button_width; },
          y: function(d) {
            return d.has_attributes() ? 0 : -node_box_height / 4;
          },
        })
        .on("click", DtdDiagram.Node.click_handler)
      ;

      // Button for nodes that have attributes
      var has_attr_nodes = elem_attr_nodes.filter(function(d) {
        return d.has_attributes();
      });
      has_attr_nodes.append("text")
        .attr({
          "class": "button-text attr-button",
          x: 0,
          y: 0,
          "text-anchor": "baseline",
          "alignment-baseline": "middle",
        })
        .text(' @ ')
        .style("fill-opacity", 0)
      ;
      has_attr_nodes.append("rect")
        .attr({
          "data-id": function(d) { return d.id; },
          "class": "button",
          width: button_width,
          height: node_box_height / 2,
          x: function(d) { return d.width - button_width; },
          y: function(d) {
            return d.has_content() 
              ? -node_box_height / 2 : -node_box_height / 4;
          },
        })
        .on("click", DtdDiagram.Node.click_handler)
      ;

      var choice_nodes = nodes_enter.filter(function(d) {
        return d.type == "choice";
      });
      choice_nodes.append("polygon")
        .attr({
          'class': 'choice',
          'points': '0,0 1,-1 2,0 1,1'
        })
      ;

      var seq_nodes = nodes_enter.filter(function(d) {
        return d.type == "seq";
      });

      // This generates a bulbous sequence figure, which is supposed
      // to look like a stylized vertical ellipsis, with room for 
      // a quantifier in the center circle.
      function seq_path_gen(cr, d, r) {
        var yp = (cr * cr - r * r + d * d) / (2 * d);
        var xp = Math.sqrt(cr * cr - yp * yp),
            x1 = cr - xp, 
            x2 = cr + xp;
        return 'M ' + x1 + ' ' + (-yp) + ' ' +
          'A ' +  r + ' ' +  r + ' 0   1 1 ' + x2 + ' ' + (-yp) + ' ' +
          'A ' + cr + ' ' + cr + ' 0   0 1 ' + x2 + ' ' + yp + ' ' +
          'A ' +  r + ' ' +  r + ' 0   1 1 ' + x1 + ' ' + yp + ' ' +
          'A ' + cr + ' ' + cr + ' 0   0 1 ' + x1 + ' ' + (-yp) + ' ' +
          'z';
      }
      seq_nodes.append("path")
        .attr({
          'class': 'seq',
          'd': seq_path_gen(1.0, 1.2, 0.5),
        })
      ;

      // Text label for `q`
      nodes_enter.filter(function(d) {return !!d.q;})
        .append("text")
          .attr({
            "class": "q",
            x: 0,
            y: 0,
            "text-anchor": function(d) {
              return d.type == "element" ? "start" : "middle";
            },
            "alignment-baseline": "middle",
          })
          .text(function(d) {return d.q;})
          .style("fill-opacity", 0)
      ;


      // 2A - Compute the new tree layout, and get the list of links.
      var engine = diagram.engine;
      engine.nodes(root);
      var links = engine.links(nodes);

      // 2B - Start transitions of scrollbars and drawing size
      var p = DtdDiagram.Canvas.scroll_resize(diagram);
      var do_last = p.do_last || null;
      promises.push(p);
      diagram.canvas = diagram.new_canvas.copy();


      // 3 - Transition all nodes to their new position.
      var duration = diagram.duration;
      promises.push(transition_promise(
        nodes_update.transition()
          .duration(duration)
          .attr("transform", function(d) { 
            return "translate(" + d.y + "," + d.x + ")"; 
          })
      ));


      // 4 - Transition all entering node stuff to final attribute values

      nodes_enter.each(function(d) {
        promises.push(d.transition_enter(this));
      });

      promises.push(transition_promise(
        nodes_enter.select(".label").transition()
          .duration(duration)
          .style("fill-opacity", 1)
          .attr({
            x: function(d) { return node_text_margin + (d.q ? q_width : 0); }
          })
      ));
      promises.push(transition_promise(
        nodes_enter.select(".q").transition()
          .duration(duration)
          .style("fill-opacity", 1)
          .attr("x", node_text_margin)
      ));


      // FIXME: need transition effects for button, choice, seq.

      nodes_enter.select(".choice").transition()
        .duration(duration)
        .attr("points", '0,0 12,-12 24,0 12,12');
      nodes_enter.select(".seq").transition()
        .duration(duration)
        .attr("d", seq_path_gen(7, 6, 7));

      has_kids_nodes.select(".elem-button").transition()
        .duration(duration)
        .attr({
          x: function(d) { return d.width - button_width; },
          y: function(d) {
            return d.has_attributes() ? node_box_height / 4 : 0;
          },
        })
        .style("fill-opacity", 1)
      ;
      has_attr_nodes.select(".attr-button").transition()
        .duration(duration)
        .attr({
          x: function(d) { return d.width - button_width; },
          y: function(d) {
            return d.has_content() ? -node_box_height / 4 : 0;
          },
        })
        .style("fill-opacity", 1)
      ;


      // 5A - Diagonals - starting positions
      var link = svg_g.selectAll("path.link")
        .data(links, function(d) { return d.target.id; });

      // Enter any new links at the parent's previous position.
      var diagonal = diagram.diagonal;
      link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
          var o = {x: src_node.x0, y: src_node.y0, width: 0};
          return diagonal({source: o, target: o});
        });

      // 5B - Transition links to their new position.
      link.transition()
        .duration(duration)
        .attr("d", diagonal);

      // 5C - Transition exiting links to the parent's new position.
      link.exit().transition()
        .duration(duration)
        .attr("d", function(d) {
          var o = {x: src_node.x0, y: src_node.y0, width: 0};
          return diagonal({source: o, target: o});
        })
        .remove();

      // FIXME: add promises for the above transitions.


      // 6 - Transition exiting nodes to the parent's new position.
      var nodes_exit = nodes_update.exit().transition()
        .duration(duration)
        .attr("transform", function(d) { 
          return "translate(" + src_node.y + "," + src_node.x + ")"; 
        })
        .remove();

      nodes_exit.select(".node-box").attr("width", 0);
      nodes_exit.select(".label,.q")
        .style("fill-opacity", 0);

      // FIXME: make promise and add the above transition to the list.

      Promise.all(promises).then(
        function(msg) {
          console.log("Transitions complete: " + msg);
          if (do_last) do_last();
        },
        function(msg) {
          console.error("Problem during transistions: " + msg);
        }
      );



      // Stash the old positions for transition.
      nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    };

    return _DtdDiagram;
  }(jQuery);

}