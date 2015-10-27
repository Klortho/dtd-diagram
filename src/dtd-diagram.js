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
      // FIXME: I think a lot of these should not be options. (That doesn't mean
      // they shouldn't be parameterized.)
      min_canvas_width: 800,
      min_canvas_height: 500,
      node_text_margin: 10,     // horizontal margin, on both sides
      node_height: 32,
      node_box_height: 25,
      q_width: 15,
      button_width: 15,
      diagonal_width: 20,
      scrollbar_margin: 20,
      dropshadow_margin: 5,

      // Ratio of the separation between groups to the separation between sibling nodes
      group_separation: 1.4,

      // Duration of the animation, in milliseconds.
      duration: 5,
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
      diagram.svg_g = svg.append("g")
        .attr({"transform": "translate(0, " + (-canvas.top) + ")"});

      // Create the flextree layout and set options
      var engine = diagram.engine = d3.layout.flextree()
        .nodeSize(function(d) {
          return [diagram.node_height, d.y_size()];
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
          return { x: s.x, y: s.y + s.width() };
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

      // Keep a list of all promises
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
        n.transition_update();
      });

      // Transition exiting nodes to the parent's new position, and
      // zero size.
      diagram.nodes_exit.each(function(n) {
        n.transition_exit();
      });


      // Links (diagonals)
      // -----------------

      var links = engine.links(nodes);

      // Bind the links to the SVG paths
      var link = diagram.svg_g.selectAll("path.link")
        .data(links, function(d) { return d.target.id; });

      // Enter any new links at the parent's previous position.
      var diagonal = diagram.diagonal;
      link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
          var o = {x: src_node.x0, y: src_node.y0, 
                   width: function() {return 0;}};
          return diagonal({source: o, target: o});
        });

      // Transition links to their new position.
      var duration = diagram.duration;
      link.transition()
        .duration(duration)
        .attr("d", diagonal);

      // Transition exiting links to the parent's new positions.
      link.exit().transition()
        .duration(duration)
        .attr("d", function(d) {
          var o = {x: src_node.x, y: src_node.y, 
                   width: function() {return 0;}};
          return diagonal({source: o, target: o});
        })
        .remove();


      // Canvas / scrollbars
      // -------------------

      // Transition scrollbars and drawing size
      var p = DtdDiagram.Canvas.scroll_resize(diagram);
      var do_last = p.do_last || null;
      promises.push(p);
      diagram.canvas = diagram.new_canvas.copy();



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