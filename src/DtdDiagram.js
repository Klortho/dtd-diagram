// Define a global class DtdDiagram

if (typeof d3 !== "undefined")
{
  (function() {

    DtdDiagram = function(constructor_opts) {
      var diagram = this;
      DtdDiagram.diagrams.push(diagram);
      diagram.constructor_opts = constructor_opts || {};

      // Defer everything else, including options handling, until document
      // ready.
      document_ready
        .then(function() {
          return diagram.initialize();
        })
        .then(function() {
          // FIXME: implement src_node
          return diagram.update(diagram.root_node);
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
      root_name: null,

      // Initial expand/collapse state of the entire tree, as a compressed
      // base64 string. Default is "S" => "01", meaning the root node's attributes 
      // will be collapsed, and the content expanded.
      ec_state: "S",

      // Initial source node address
      src_node_addr: "",

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

      // Event callback function for when the user clicks any of the buttons.
      // This allows us to update the fragment identifier
      event_handler: null,
    };

    // Parse the current location query string, and return an object for
    // the diagram with the given container id. 
    // Example: ?d1=article!AF1b!7uI
    DtdDiagram.prototype.get_query_string_opts = function() {
      var diagram = this;
      var qs = window.location.search;
      if (!qs || qs.charAt(0) == '?') return;
      qs.substr(1).split('&').map(function(kvstr) { 
        // kvstr => 'd1=article!AF1b!7uI'
        var kv = kvstr.split('=');
        if (kv.length == 2 && kv[0] == diagram.container_id) {
          ds = {};
          var ps = kv[1].split('!');
          ds.root_name = ps[0];
          if (ps.length > 1) ds.ec_state = ps[1];
          if (ps.length > 2) ds.src_node_addr = ps[2];
          return ds;
        }
      });
      return null;
    }


    // Initialize the diagram, by computing and storing the options, creating
    // the svg element, reading the JSON dtd file, instantiating and configuring 
    // the layout engine. Returns a Promise that resolves after the JSON dtd
    // is read.
    DtdDiagram.prototype.initialize = function() {
      var diagram = this;
      diagram.last_id = 0;
      diagram.nodes = [];

      // User can pass in a specifier for the div either as an
      // id string or a DOM Element
      var constructor_opts = diagram.constructor_opts,
          container_id,
          container_dom;

      if (typeof constructor_opts.container == "object") {
        container_dom = constructor_opts.container;
        container_id = container_dom.getAttribute("id");
      }
      else {
        container_id = constructor_opts.container || 'dtd-diagram';
        container_dom = document.getElementById(container_id);
      }

      if (!container_dom) {
        console.error("DtdDiagram error: no container element with ID " +
          container + " was found");
        return;
      };
      diagram.container_id = container_id;
      diagram.container_dom = container_dom;

      // Create the D3 selection for the container
      var container_d3 = diagram.container_d3 = d3.select(container_dom);

      // Parse the query string, looking for state information for this
      // diagram
      var qs_opts = diagram.get_query_string_opts();

      // Set a unique id for this diagram, to validate history state objects
      diagram.uid = Math.floor(Math.random() * 1000000000000);

      // Get the options specified on the @data-options attribute
      var tag_opts_json = container_dom.getAttribute("data-options");
      var tag_options = tag_opts_json ? JSON.parse(tag_opts_json) : {};

      // Combine defaults with tag options
      var opts = {};
      DtdDiagram.extend(opts, DtdDiagram.default_options, tag_options);

      // Save the "reset state" for this diagram's root_name, ec_state, and src_node.
      // The reset state is the state that
      // it reverts to when the tree is reinstantiated with no other state
      // information. This does not use the query-string values.
      diagram.reset_state = {
        root_name: constructor_opts.root_name || opts.root_name,
        ec_state: constructor_opts.ec_state || opts.ec_state,
        src_node_addr: constructor_opts.src_node_addr || opts.src_node_addr,
      };

      // Finally, set the properties on the diagram object itself.
      DtdDiagram.extend(diagram, opts, qs_opts, constructor_opts);

      // Bind to the popstate event
      window.onpopstate = function(evt) {
        console.log("popstate: %o", evt.state);
        var state = diagram.last_state || null;
        if (!state || !state.action || state.action == "rebase") {
          d3.select('#dtd-diagram').html("");
          make_diagram();
        }
        else {
          parse_frag();
          diagram.set_state(frag.state);
          // FIXME: need to look up the correct src_node
          diagram.update(state.node_id);
        }
        diagram.last_state = evt.state;
      };


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

    // This creates the root_node from the root_name, for a new tree of
    // nodes, and then expands it, per the ec_state.
    DtdDiagram.prototype.initialize_root = function() {
      var diagram = this,
          root_name = diagram.root_name;

      if (root_name && !diagram.dtd_json.elements[root_name]) {
        diagram.root_name = null;
        throw new Error("Can't find a declaration for element " + root_name +
          " in the DTD.");
      }

      var root_node = diagram.root_node = DtdDiagram.Node.factory(diagram, {
        name: root_name || diagram.dtd_json.root,
        type: 'element',
      }, null);
      diagram.root_node.x0 = 0;
      diagram.root_node.y0 = 0;

      // Set the initial expand/collapse state
      diagram.set_state(diagram.ec_state);
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
          root_name,
          root_node;

      if (n == null || typeof n == "string") {
        diagram.root_name = n;
        diagram.initialize_root();
        root_node = diagram.root_node;
      }
      else {
        diagram.root_name = n.name;
        root_node = diagram.root_node = n;
        root_node.redraw = true;
        root_node.q = null;
        delete root_node["_width"]; 
      }
      diagram.update(root_node);
    };

    // Main function to update the rendering. This is called once at the 
    // beginning, and once every time a user clicks a button on a node.
    // `src_node` is the node object that was clicked.
    DtdDiagram.prototype.update = function(src_node) {
      var diagram = this;
      diagram.src_node = src_node;

      // Keep a list of all promises (lest we forget)
      var promises = [];

      // Nodes
      // -----

      // Compute the new tree layout
      var engine = diagram.engine;
      var nodes = engine.nodes(diagram.root_node);

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

    // Get the diagram's expand/collapse state as a base64 string
    DtdDiagram.prototype.state = function() {
      var s = this.root_node.state();
      return DtdDiagram.Compressor.compress(s);
    };

    // Set the diagram's state
    DtdDiagram.prototype.set_state = function(s) {
      if (typeof s == "undefined" || !s) s = this.ec_state || "S";
      var binstr = DtdDiagram.Compressor.decompress(s);
      this.root_node.set_state(binstr);
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