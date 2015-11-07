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

    

* Move more things into the StateManager module
    * Every change to any of the "state properties" should be implemented through a 
      method defined in StateManager:
        * orig_root_name
        * orig_root_node
        * current_root_addr
        * current_root_node
        * ec_state
        * src_node_addr
        * src_node


* Figure out how to test with a mock browser, for testing window.location and the 
  history state stuff.
* diagram.update() shouldn't take an argument. Instead, the caller should first
  set src_node
* Need to implement DtdDiagram.set_src_node()
* [c] get rid of the _width cache on nodes -- it will simplify things, and it is 
  unnecessary, since we already have the diagram.label_width_cache
* use WindowBase64 functions for base64 encoding/decoding
* For compression, use elias gamma encoding, using Uint[8|16|32]Arrays; see
  http://jsperf.com/elias-gamma-encode
* Need to set embiggenning for rebase events
* Need to restore `q`, when transitioning a current root -> child
* At the end:
    * figure out how to make url handling pluggable, with function setters





### Events






***When we get a popstate event***

* For each diagram:
    * Get the state object -- no need to try to read the URL. If there's any error in
      any of the following, just abort, without calling update.
        * Check orig_root_name -- if it doesn't match, abort.
        * Instantiate (if necessary) nodes up to the current_root
        * Set the ec_state from there
        * Set the src_node property
        * update()





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
