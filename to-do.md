# To do

This toy project has been a catalyst for me learning a lot of new (to me)
JavaScript technologies. My goal now, though, is to try to wrap it up 
quickly and move on to some other, more practical projects.


## State handling

* use WindowBase64 functions for base64 encoding/decoding
* For compression, use elias gamma encoding, using Uint[8|16|32]Arrays; see
  http://jsperf.com/elias-gamma-encode
* Need to set embiggenning for rebase events
* Need to restore `q`, when transitioning a current root -> child
* Figure out how to make url handling pluggable, with function setters


### Survey of lifecycle events

***Create a new diagram***

* Make sure it handles these cases:
    * No state information either in history or URL (I think this should
      use replacestate to change the URL; right now it doesn't)
    * State info in URL, not in history
    * State info in history but not URL
    * State info in both, that agrees or disagrees


***User clicks***

Check these things:

* expand
* collapse
* rebase


***Forward / back buttons (popstate events)***

* For each diagram:
    * Get the state object -- no need to try to read the URL. If there's any error in
      any of the following, just abort, without calling update.
        * Check orig_root_name -- if it doesn't match, abort.
        * Instantiate (if necessary) nodes up to the current_root
        * Set the ec_state from there
        * Set the src_node property
        * update()

    * Can I just call initialize_tree? It calls:
        * diagram.set_current_root();
            * needs current_root_addr
        * diagram.set_ec_state();
            * needs ec_state
        * diagram.set_src_node();
            * needs src_node_addr
        * diagram.update_state();
    };





## Miscellaneous

* Make sure we update to the layout-bug-fixed version of d3-flextree
* Add a `use_history` option - defaults to true. When false, all of this is turned off.


## Testing

* Make sure forward button works
* Test when you reload a page that's in the middle of a bunch of history, and
  then press back and forward buttons
* Test with multiple diagrams


## Enhancement: optimize/simplify some drawings

In the JATS DTDs, the content models are often overly complex.

* "choice-of-one" and "seq-of-one" can be removed: see front/notes;
  combine the 'q's intelligently
* If seq is the only child, and no q, remove it


## Finish up

* Maybe: for an element that takes just #PCDATA, change the content button to a
  green-tinted "C"
* Test on other browsers
    * Resizing the svg doesn't seem to work on FF
* On the demo page, put, side-by-side, images of the old near-and-far versions


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


