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
      choice_seq_node_width: 18,
      q_width: 15,
      button_width: 15,
      diagonal_width: 20,
      scrollbar_margin: 20,
      dropshadow_margin: 5,

      // Ratio of the separation between groups to the separation between sibling nodes
      group_separation: 1.4,

      // Duration of the animation, in milliseconds.
      duration: 2000,
    };


    // Initialize the diagram, by computing and storing the options, creating
    // the svg element, instantiating and configuring the layout engine
    _DtdDiagram.prototype.initialize = function() {
      var diagram = this;

      var Box = DtdDiagram.Box;
      var Node = DtdDiagram.Node;
      diagram.error = false;
      diagram.last_id = 0;

      // User can pass in a specifier for the div either as an
      // id string, a DOM Element, or a jQuery object.
      var opts = diagram.opts;
      var container = opts.container || 'dtd-diagram';
      var container_jq = diagram.container_jq =
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

      // Set local variables for the options, for convenience
      var dtd_json_file = diagram.dtd_json_file,
          test_file = diagram.test_file,
          root_element = diagram.root_element,
          tag_doc_url = diagram.tag_doc_url,
          min_canvas_width = diagram.min_canvas_width,
          min_canvas_height = diagram.min_canvas_height,
          node_text_margin = diagram.node_text_margin,
          node_height = diagram.node_height,
          node_box_height = diagram.node_box_height,
          choice_seq_node_width = diagram.choice_seq_node_width,
          q_width = diagram.q_width,
          scrollbar_margin = diagram.scrollbar_margin,
          dropshadow_margin = diagram.dropshadow_margin,
          group_separation = diagram.group_separation,
          duration = diagram.duration;

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
      container_d3.style({
        'width': (min_canvas_width + scrollbar_margin) + 'px',
        'height': (min_canvas_height + scrollbar_margin) + 'px'
      });

      // Initialize the SVG
      var canvas = diagram.canvas = new Box(
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
          return a.elem_parent == b.elem_parent ? 1 : group_separation;
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
          console.log("diagonal returning [" + d.y + "," + d.x + "]");
          return [d.y, d.x];
        })
      ;

      // Read the input file, and return the promise
      return new Promise(function(resolve, reject) {
        if (test_file) {
          // The test file is an already-expanded tree, not from the DTD
          d3.json(test_file, function(error, _test_json) {
            diagram.root = Node.bless(diagram, _test_json, null);
            resolve();
          });
        }
        else {
          d3.json(dtd_json_file, function(error, _dtd_json) {
            if (error) {
              var msg = "Error reading DTD file '" + dtd_json_file + 
                  "': " + error.statusText;
              console.error(msg);
              diagram.error = msg;
              reject(msg);
            }
            else {
              var dtd_json = diagram.dtd_json = _dtd_json;

              // Create the new tree. Unlike any subsequent element nodes, the root Node 
              // is from a hand-crafted object, rather than being copied from an element 
              // spec in the DTD
              var root = diagram.root = new Node(diagram, {
                name: root_element || dtd_json.root,
              }, null);
              // Initialize the root node, which causes all of its children to
              // be instantiated from the DTD
              root.initialize();
              // Initial state: root node expanded
              root.expand();
              resolve();
            }
          });
        }
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
    // ended.
    function transition_promise(t) {
      var n = 0;
      return new Promise(function(resolve, reject) {
        if (t.length == 0) resolve();
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

      // Some local variable shortcuts
      var button_width = diagram.button_width,
          choice_seq_node_width = diagram.choice_seq_node_width,
          diagonal = diagram.diagonal,
          diagonal_width = diagram.diagonal_width,
          duration = diagram.duration,
          engine = diagram.engine,
          node_box_height = diagram.node_box_height,
          node_height = diagram.node_height,
          node_text_margin = diagram.node_text_margin,
          q_width = diagram.q_width,
          root = diagram.root,
          svg_g = diagram.svg_g;

      // Since the node widths depend on the widths of the text inside each
      // node, and those widths are used in the laying out of the tree, we
      // have to bind the data and create the text nodes first.

      // This gives us the complete array of nodes
      var nodes = d3.layout.hierarchy()(root);

      // Bind the data. The second argument to .data() provides the key,
      // to ensure that the same data value is bound to the same node every
      // time.
      var nodes_update = svg_g.selectAll("g.node")
        .data(nodes, function(d) { 
          return d.id || (d.id = ++diagram.last_id); 
        })
      ;

      // Drawing work:
      //
      //  1. For all the entering nodes:
      //     A. Create the <g> containers. They will already be in their final
      //        positions
      //     B. Draw the SVG elements that depict the node, with 
      //        pre-transition positions and attributes. 
      //     C. Precompute some widths, and attach them to the Node objects
      //  2. Layout work
      //     A. Do the layout
      //     B. Start transition of scrollbars and drawing size
      //  3. For ALL nodes, start transitions of the <g> containers to 
      //     their final positions
      //  4. Back to entering nodes:
      //     For all the SVG elements, start transitions to final attributes
      //  5. Diagonals
      //     A. Draw starting positions
      //     B. Start transitions to ending positions
      //     C. Transition exiting links to their parents' positions
      //  6. For all exiting nodes:
      //     Transition them to their "gone" positions and attributes

      // Keep a list of all promises
      var promises = [];

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

      // 1B - Draw the nodes with pre-transition positions and attributes.

      // element and attribute nodes
      var elem_attr_nodes = nodes_enter.filter(function(d) {
        return d.type == "element" || d.type == "attribute";
      });

      // draw the main rectangle
      elem_attr_nodes.append("rect")
        .attr({
          "data-id": function(d) { return d.id; },
          "class": "node-box",
          width: 0,
          height: node_box_height,
          y: - node_box_height / 2,
          rx: 6,
          ry: 6,
        })
      ;

      // draw the text
      elem_attr_nodes.append("a")
        .attr("xlink:href", function(d) {
          // FIXME: need to use URL templates
          return diagram.tag_doc_url + "elem-" + d.name;
        })
        .append("text")
          .attr({
            id: function(d) { return d.id; },
            "class": "label",
            x: 0,
            y: 0,
            "text-anchor": "baseline",
            "alignment-baseline": "middle",
          })
          .text(function(d) { 
            return d.name; 
          })
          .style("fill-opacity", 0)
      ;

      // Expander button for nodes that have kids
      elem_attr_nodes.filter(function(d) {
          return d.has_children();
        })
        .append("rect")
          .attr({
            "data-id": function(d) { return d.id; },
            "class": "button",
            width: 0,
            height: node_box_height,
            y: - node_box_height / 2,
            x: 0,
          })
          .on("click", Node.click_handler)
      ;

      // Button for nodes that have attributes
      // FIXME:  TBD

      var choice_nodes = nodes_enter.filter(function(d) {
        return d.type == "choice";
      });
      choice_nodes.append("circle")
        .attr({
          'class': 'choice',
          r: choice_seq_node_width/2,
        })
      ;

      var seq_nodes = nodes_enter.filter(function(d) {
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

      // 1C - precompute some node sizes, and attach them to the Node objects.
      // Note that this has to come after the text is drawn.
      nodes_enter.each(function(d) {
        d.x_size = node_height;
        if (d.type == 'element' || d.type == 'attribute') {
          d.width = node_text_margin * 2 + 
                    (d.q ? q_width : 0) +
                    (d.has_children() || d.has_attributes() ? button_width : 0) +
                    document.getElementById(d.id).getBBox()["width"];
        }
        else {
          d.width = choice_seq_node_width;
        }
        d.y_size = d.width + diagonal_width;
      });

      // 2A - Compute the new tree layout, and get the list of links.
      engine.nodes(root);
      var links = engine.links(nodes);

      // 2B - Start transitions of scrollbars and drawing size
      var p = DtdDiagram.Canvas.scroll_resize(diagram);
      var do_last = p.do_last || null;
      promises.push(p);
      diagram.canvas = diagram.new_canvas.copy();


      // 3 - Transition all nodes to their new position.
      promises.push(transition_promise(
        nodes_update.transition()
          .duration(duration)
          .attr("transform", function(d) { 
            return "translate(" + d.y + "," + d.x + ")"; 
          })
      ));


      // 4 - Transition all entering node stuff to final attribute values

      promises.push(transition_promise(
        nodes_enter.select(".node-box").transition()
          .duration(duration)
          .attr("width", function(d) { return d.width; })
      ));
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





      // 5A - Diagonals - starting positions
      var link = svg_g.selectAll("path.link")
        .data(links, function(d) { return d.target.id; });

      // Enter any new links at the parent's previous position.
      link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
          var o = {x: src_node.x0, y: src_node.y0};
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
          var o = {x: src_node.x, y: src_node.y};
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