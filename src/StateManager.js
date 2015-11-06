// StateManager - DtdDiagram methods for managing state. See Implementation.md,
// "Managing state".

// For testing, so this module can work stand-alone
if (typeof DtdDiagram == "undefined") DtdDiagram = function() {};

(function() {

  //-----------------------------------------------------------------------
  // Utility functions

  // Compute the address of a node relative to some other node
  function node_relative_addr(base, n) {
    return n.id.substr(base.id.length + 1);
  };

  // Walk the tree out to a given node address, in order to instantiate
  // all the intervening nodes. end_addr is the absolute address of the
  // target node.
  function walk_to_node(diagram, start_node, end_addr) {
    var rel_addr = node_relative_addr(start_node.id, end_addr);
    var addr = rel_addr.split(",");
    var n = start_node;
    var ni;
    while (typeof (nistr = addr.shift()) != "undefined") {
      var ni = parseInt(nistr);
      n = n.get_child(ni);
    }
    return n;
  }


  //// Bind to the popstate event
  //window.onpopstate = function(evt) {
  //  console.log("popstate: %o", evt.state);
  //  var state = diagram.last_state || null;
  //  if (!state || !state.action || state.action == "rebase") {
  //    d3.select('#dtd-diagram').html("");
  //    make_diagram();
  //  }
  //  else {
  //    parse_frag();
  //    diagram.set_state(frag.state);
  //    // FIXME: need to look up the correct src_node
  //    diagram.update(state.node_id);
  //  }
  //  diagram.last_state = evt.state;
  //};

  //-----------------------------------------------------------------------
  // DtdDiagram methods

  // This is called during diagram.initialize(), to get the initial state, either
  // from a state object, if there is one, or from the URL.
  DtdDiagram.prototype.get_initial_state = function() {
    var diagram = this;
    if (history.state) return history.state[diagram.container_id] || null;

    var url_state = diagram.get_url_state();
    if (!url_state) return null;

    return {
      orig_root_name: url_state.root_name,
      current_root_addr: "0",
      ec_state: url_state.ec_state,
      src_node_addr: url_state.src_node_addr,
    };
  };

  // Parse the current location query string, and return an object for
  // the diagram with the given container id. Or null.
  // Example: ?d1=article!AF1b!7uI
  DtdDiagram.prototype.get_url_state = function() {
    var diagram = this;
    var qs = window.location.search;
    if (!qs || qs.charAt(0) == '?') return;
    qs.substr(1).split('&').forEach(function(id_val_str) { 
      // id_val_str => 'd1=article!AF1b!7uI'
      var id_val = id_val_str.split('=');
      if (id_val.length == 2 && id_val[0] == diagram.container_id) {
        url_state = {};
        var vals = id_val[1].split('!');
        return {
          root_name: vals[0],
          ec_state: (vals.length > 1 ? vals[1] : null),
          src_node_addr: (vals.length > 2 ? vals[2] : null),
        };
      }
    });
    return null;
  };

  // If there is no state object for this diagram, then the diagram must have
  // been instantiated from other data; so call replaceState() to set this
  // history.state object to match
  DtdDiagram.prototype.update_state = function() {
    var diagram = this;
    var state = history.state || {};
    var did = diagram.container_id;
    if (state[did]) return;
    state[did] = {
      orig_root_name: diagram.orig_root_name,
      current_root_addr: diagram.current_root_addr,
      ec_state: diagram.ec_state,
      src_node_addr: diagram.src_node_addr,
    };
    //history.replaceState(state, null);
  };


  // Push state, after a change
  DtdDiagram.prototype.push_state = function() {
    var diagram = this;
    var dstate = {};
    dstate[diagram.container_id] = {
      orig_root_name: diagram.orig_root_name,
      current_root_addr: diagram.current_root_addr,
      ec_state: diagram.ec_state,
      src_node_addr: diagram.src_node_addr,
    };
    var state = DtdDiagram.extend(
      {}, history.state, dstate
    );

    var first = true;
    var url = "";
    Object.keys(history.state).forEach(function(k) {
      var dso = history.state[k];  // diagram state object
      var diag = DtdDiagram.diagrams_hash[k];  // diagram
      if (diag && dso && dso.orig_root_name) {
        url += (first ? "?" : "&") + k + "=" + diag.current_root_node.name + "!" + 
               dso.ec_state + "!" + dso.src_node_addr;
      }
      first = false;
    });
    //history.pushState(state, null, url);
  };



  // Get the diagram's expand/collapse state as a base64 string
  DtdDiagram.prototype.get_ec_state = function() {
    var s = this.current_root_node.state();
    return DtdDiagram.Compressor.compress(s);
  };

  // Set the diagram's expand/collapse state, based on the current
  // values of current_root_node and ec_state.
  DtdDiagram.prototype.set_ec_state = function() {
    var s = this.ec_state;
    var binstr = DtdDiagram.Compressor.decompress(s);
    this.current_root_node.set_ec_state(binstr);
  };


  //-----------------------------------------------------------------------
  // Public getters and setters - use only these from outside this module,
  // in order to maintain consistency of the state variables

  // Set current root, either from a Node object, or from an address. If there's
  // no argument, then this will use the diagram.current_root_addr to set the _node.
  DtdDiagram.prototype.set_current_root = function(cr) {
    var diagram = this;

    if (typeof cr == "object") {
      diagram.current_root_node = cr;
      diagram.current_root_addr = cr.id;
    }
    else {
      if (typeof cr == "undefined") cr = diagram.current_root_addr;
      if (typeof diagram.nodes[cr] == "undefined") {
        walk_to_node(diagram, diagram.orig_root_node, cr);
      }
      diagram.current_root_node = diagram.nodes[cr];
    }
  };

  // Set the src_node, either from an address (relative to the current root)
  // or from an ElementNode object. If no argument is given, this will use
  // diagram.src_node_addr to set the src_node object.

  DtdDiagram.prototype.set_src_node = function(sn) {
    var diagram = this;

    if (typeof sn == "object") {
      diagram.src_node = sn;
      diagram.src_node_addr = 
        node_relative_addr(diagram.current_root_addr, sn.addr);
    }
    else {
      if (typeof sn == "undefined") sn = diagram.src_node_addr;
      var sn_abs_addr = diagram.current_root_addr + (sn == "" ? "" : ("," + sn));
      if (typeof diagram.nodes[sn_abs_addr] == "undefined") {
        walk_to_node(diagram, diagram.current_root_node, sn_abs_addr);
      }
      diagram.src_node = diagram.nodes[sn_abs_addr];
    }
  };

  // Update the src_node_addr from the src_node
  DtdDiagram.prototype.update_src_node_addr = function() {
    this.src_node_addr = DtdDiagram.node_relative_addr(
      this.current_root_node, this.src_node);
  };

  

})();
