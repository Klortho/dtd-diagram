// StateManager - DtdDiagram methods for managing state

(function() {

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

  var StateManager = DtdDiagram.StateManager = {

    // This is called during diagram.initialize(), to get the initial state, either
    // from a state object, if there is one, or from the URL.
    get_initial_state: function(diagram) {
      if (history.state) return history.state[diagram.container_id] || null;

      var url_state = StateManager.get_state_url(diagram);
      if (!url_state) return null;

      url_state.orig_root_name = url_state.current_root_name;
      url_state.current_root_addr = "0";
      return url_state;
    },

    // Parse the current location query string, and return an object for
    // the diagram with the given container id. Or null.
    // Example: ?d1=article!AF1b!7uI
    get_state_url: function(diagram) {
      var qs = window.location.search;
      if (!qs || qs.charAt(0) == '?') return;
      qs.substr(1).split('&').map(function(kvstr) { 
        // kvstr => 'd1=article!AF1b!7uI'
        var kv = kvstr.split('=');
        if (kv.length == 2 && kv[0] == diagram.container_id) {
          ds = {};
          var ps = kv[1].split('!');
          ds.current_root_name = ps[0];
          if (ps.length > 1) ds.ec_state = ps[1];
          if (ps.length > 2) ds.src_node_addr = ps[2];
          return ds;
        }
      });
      return null;
    },

    // If there is no state object for this diagram, then the diagram must have
    // been instantiated from other data; so call replaceState() to set this
    // history.state object to match
    update_state: function(diagram) {
      var state = history.state || {};
      var did = diagram.container_id;
      if (state[did]) return;
      state[did] = {
        orig_root_name: diagram.orig_root_name,
        current_root_addr: diagram.current_root_addr,
        ec_state: diagram.ec_state,
        src_node_addr: diagram.src_node_addr,
      };
      history.replaceState(state, null);
    },

    // Compute the address of a node relative to some other node
    node_relative_addr: function(base, n) {
      return n.id.substr(base.id.length + 1);
    },

    // Push state, after a change
    push_state: function(diagram) {
      var state = DtdDiagram.extend(
        {},
        history.state,
        { 
          [diagram.container_id]: {
            orig_root_name: diagram.orig_root_name,
            current_root_addr: diagram.current_root_addr,
            ec_state: diagram.ec_state,
            src_node_addr: diagram.src_node_addr,
          },
        }
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
      history.pushState(state, null, url);
    }

  };



})();
