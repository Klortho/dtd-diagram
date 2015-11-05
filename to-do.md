# To do

## Project management

* Maybe try some scaffolding tool like Yeoman, to see how they do it.
* I want to keep dist/ out of the repo, or, at least, out of whatever branch
  that I'm working on, so that I don't always see it as changed 
  in my `git status`.
* But the gh-pages demo requires the generated css file (but not the generated 
  JS -- I'm using gulp-inject to put script tags to the sources in index.html)
* Presumably npm and bower registries will require all the
  product files to be in *some* branch, and probably master
* And, it would be nice for first-time visitors to be able to grab the latest
  working version from the master branch.
* Right now:
    * dist/ is not in master
    * I have a `gulp deploy` task set up, that pushes dist/ to gh-pages,
      locally and remote. But ***I don't understand how it works***, and
      I don't think I have it set up correctly.
    * It is not ideal, because doesn't satisfy all the nice-to-haves above.
* Whatever I come up with here should be back-ported to d3-flextree.


## State handling

Read this [excellent intro](https://developer.mozilla.org/en-US/docs/Web/API/History_API).

### Goals

* Diagrams are bookmarkable
* Back and forward buttons work seamlessly, in that the diagram gracefully animates
  into its previous (next) state, with the update, enter, exit selections correct
* This functionality should be in the main library, not in the index.html, and
  should be on by default
* Provide function setters to let user override how state info gets put into, and
  retrieved from, the URL





### Events

***When a new DtdDiagram is instantiated***

* [c] Get state info, if present:
    * If there's history.state object, use that
    * Else no history.state, check the URL. In addition to what's given explicitly:
        * orig_root_name = current_root_name
        * current_root_addr = "0"

* [c] Instantiate a diagram.
    * First merge opts <- defaults <- @data-options <- state <- constructor opts

* [c] Read the dtd json, then create the tree of nodes
    * [c] Instantiate orig_root_node, based on its name
    * [c] Instantiate nodes up to the current_root
    * [c] Set ec_state from current_root
    * [tbd] Set the src_node property from its address

* [c] If there was no history.state for this diagram, call history.replaceState


***When we get a popstate event***

* For each diagram:
    * Get the state object -- no need to try to read the URL. If there's any error in
      any of the following, just abort, without calling update.
        * Check orig_root_name -- if it doesn't match, abort.
        * Instantiate (if necessary) nodes up to the current_root
        * Set the ec_state from there
        * Set the src_node property
        * update()


***Any user event***

* [c] The src_node is the node the user clicked on; 
  update the src_node_addr
* [c] If rebase:
    * update current_root_node, current_root_addr
    * expand its content if it's completely collapsed
* [c] Update diagram.ec_state
* history.pushState()
    - Still need to compute the new URLs
* [c] diagram.update()


### New option

* use_history - ***new*** - defaults to true. When false, all of this is turned off.


### Testing

* Make sure forward button works
* Test when you reload a page that's in the middle of a bunch of history, and
  then press back and forward buttons


## Enhancement: optimize/simplify some drawings: 

* "choice-of-one" and "seq-of-one" can be removed: see front/notes;
  combine the 'q's intelligently
* If seq is the only child, and no q, remove it


## Finish up

* Maybe: for an element that takes just #PCDATA, change the content button to a
  green-tinted "C"
* Test on other browsers
    * Resizing the svg doesn't seem to work on FF
* On the demo page, put, side-by-side, images of the old near-and-far versions
