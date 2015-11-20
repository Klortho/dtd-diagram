(function() {
  var diagram;

  DtdDiagram = function() {
    diagram = this;

    // Defer everything else document ready.
    new Promise(function(resolve) {
      document.addEventListener("DOMContentLoaded", resolve);
    })
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
  new DtdDiagram();

  // Some constants
  var scrollbar_margin = 20;

  // DTD JSON file
  diagram.dtd_json_file = "dtd.json";

  // The root element, by default, is specified in the DTD JSON file, but can
  // be overridden
  diagram.root_element = null;


  // Ratio of the separation between groups to the separation between sibling nodes
  diagram.group_separation = 1.4;

  // Duration of the animation, in milliseconds.
  diagram.duration = 500;


  // Initialize the diagram, by computing and storing the options, creating
  // the svg element, reading the JSON dtd file, instantiating and configuring 
  // the layout engine. Returns a Promise that resolves after the JSON dtd
  // is read.
  DtdDiagram.prototype.initialize = function() {
    var diagram = this;
    diagram.last_id = 0;

    var container_d3 = diagram.container_d3 = 
      d3.select(document.getElementById('dtd-diagram'));


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

    svg.attr({
      xmlns: "http://www.w3.org/2000/svg",
      xlink: "http://www.w3.org/1999/xlink",
      "width": 1000,
      "height": 1000,
    });
    diagram.svg_g = svg.append("g")
      .attr({"transform": "translate(0, 250)"});

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
          var root = diagram.root = DtdDiagram.Node.factory(diagram, {
            name: diagram.root_element || dtd_json.root,
            type: 'element',
          }, null);
          diagram.root.x0 = 0;
          diagram.root.y0 = 0;

          // Initial state: root node expanded
          root.expand();
          resolve();
        }
      });
    });
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



    Promise.all(promises).then(
      function(msg) {
        console.log("Transitions complete: " + msg);
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
