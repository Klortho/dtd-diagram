// StateManager - DtdDiagram methods for managing state. See Implementation.md,
// "Managing state".

// For testing, so this module can work stand-alone
if (typeof DtdDiagram == "undefined") DtdDiagram = function() {};

(function() {


  // Bind to the popstate event
  if (typeof window !== "undefined") 
    window.onpopstate = function(evt) {
      console.log("popstate: %o", evt.state);
      var s = evt.state;
      Object.keys(s).forEach(function(did) {
        var diagram = DtdDiagram.diagrams_hash[did];
        if (!diagram) return;
        console.log("popping for " + did);
        var state = s[did];

        diagram.set_current_root(state.current_root_addr);
        diagram.set_ec_state(state.ec_state);

        // If we're going forward, then change src_node first, then animate.
        // If we're going back, animate, then change src_node
        if (diagram.state_id < state.state_id) {
          diagram.set_src_node(state.src_node_addr);
          diagram.update();
        }
        else {
          diagram.update();
          diagram.set_src_node(state.src_node_addr);
        }
        diagram.state_id = state.state_id;
      });
    };

  //-----------------------------------------------------------------------
  // DtdDiagram methods

  DtdDiagram.last_state_id = 0;

  // This is called during diagram.initialize(), to get the initial state, either
  // from a history state object, if there is one, or from the URL, if it's there.
  // Otherwise, returns null.
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
  // Example: ?d1=article!AF1b!7uI.
  DtdDiagram.prototype.get_url_state = function() {
    var diagram = this;
    var qs = window.location.search;
    if (!qs || qs.charAt(0) != '?') return;
    var url_state = null;
    qs.substr(1).split('&').forEach(function(id_val_str) { 
      // id_val_str => 'd1=article!AF1b!7uI'
      var id_val = id_val_str.split('=');
      if (id_val.length == 2 && id_val[0] == diagram.container_id) {
        url_state = {};
        var vals = id_val[1].split('!');
        url_state = {
          root_name: vals[0],
          ec_state: (vals.length > 1 ? vals[1] : null),
          src_node_addr: (vals.length > 2 ? vals[2] : null),
        };
      }
    });
    return url_state;
  };

  // This is called after a new diagram has been instantiated. It checks the
  // history state object, and merges in this diagram's state data, then
  // calls replaceState
  DtdDiagram.prototype.update_state = function() {
    var diagram = this;
    var state = history.state || {};
    var new_state_id = DtdDiagram.last_state_id++;
    diagram.state_id = new_state_id;

    state[diagram.container_id] = {
      orig_root_name: diagram.orig_root_name,
      current_root_addr: diagram.current_root_addr,
      ec_state: diagram.ec_state,
      src_node_addr: diagram.src_node_addr,
      state_id: new_state_id,
    };
    // don't update the url, in this case
    history.replaceState(state, null);
  };


  // Push state, after a change
  DtdDiagram.prototype.push_state = function() {
    var diagram = this;
    var dstate = {};
    var new_state_id = DtdDiagram.last_state_id++;
    diagram.state_id = new_state_id;

    dstate[diagram.container_id] = {
      orig_root_name: diagram.orig_root_name,
      current_root_addr: diagram.current_root_addr,
      ec_state: diagram.get_ec_state(),
      src_node_addr: diagram.src_node_addr,
      state_id: new_state_id,
    };
    // Combine this diagram's state with all the others
    var state = DtdDiagram.extend(
      {}, history.state, dstate
    );

    // Compute the new URL, which has the state for all the diagrams
    var first = true;
    var url = "";
    Object.keys(state).forEach(function(k) {
      var dso = state[k];  // diagram state object
      var diag = DtdDiagram.diagrams_hash[k]; 
      if (diag && dso && dso.orig_root_name) {
        url += (first ? "?" : "&") + k + "=" + diag.current_root_node.name + "!" + 
               dso.ec_state + "!" + dso.src_node_addr;
      }
      first = false;
    });
    history.pushState(state, null, url);
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


  // Get the diagram's expand/collapse state as a base64 string
  DtdDiagram.prototype.get_ec_state = function() {
    var s = this.current_root_node.state();
    return this.ec_state = DtdDiagram.Compressor.compress(s);
  };

  // Set the diagram's expand/collapse state, based on the current
  // values of current_root_node and ec_state. If there is no argument, 
  // then the current ec_state value will be used.
  DtdDiagram.prototype.set_ec_state = function(s) {
    if (typeof s !== "undefined") {
      this.ec_state = s;
    }
    var binstr = DtdDiagram.Compressor.decompress(this.ec_state);
    this.current_root_node.set_ec_state(binstr);
  };


  // Set the src_node, either from an address (relative to the current root)
  // or from an ElementNode object. If no argument is given, this will use
  // diagram.src_node_addr to set the src_node object.
  DtdDiagram.prototype.set_src_node = function(sn) {
    var diagram = this;

    if (typeof sn == "object") {
      diagram.src_node = sn;
      diagram.src_node_addr = 
        node_relative_addr(diagram.current_root_addr, sn.id);
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

  
  //-----------------------------------------------------------------------
  // Utility functions

  // Compute the address of a node relative to some other node
  function node_relative_addr(base, n) {
    return n.substr(base.length + 1);
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


})();
