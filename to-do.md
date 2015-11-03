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
* Back and forward buttons work seamlessly.
* This functionality should be in the main library, not in the index.html, and
  should be on by default

### Data models

The state is defined by these, for each diagram:

* Stored in the query string param for this diagram. These can't use node id's,
  since they might differ each time we reload the page:
    * root_name: name of the root node
    * ec_state: complete expand/collapse state of the tree based at the root node
    * src_node_addr: [nice to have] the "address" of the src_node, as an array
      of numbers. Each number gives the child # of a succeeding generation

* Not saved between browser sessions, stored in the history state object, 
  with a key that matches the container id:
    * uid: generated when the diagram is instantiated, with 
      Math.floor(Math.random() * 1000000000000)
    * root_id - the `id` of the root node
    * src_node_id - the `id` of the src_node

Query string looks like this:

    ?d1=article!AF1b!7uI&d2=front!Aix!8i

giving the state data for two diagrams, `d1` and `d2`. For `d1`, for example:

* root_name = article
* ec_state = AF1b
* src_node_addr = 7uI

The state object looks like this:

```json
{
  "d1": { 
    "uid": 537613275460,
    "root_id": 12,
    "src_node_id": 18
  },
  "d2": { ... }
}
```

### Events

***When a new DtdDiagram is instantiated***

* [c] Read the q.s., looking for state for this diagram
* Instantiate a diagram. 
    * [c] Initialize a random uid for this diagram
    * [c] For root, ec_state, and src_node, first compute the "reset_state", and
      save that on the diagram object. These are the values that
      are used when we have to reinstantiate the tree during a popstate
      event. In high-to-low precedence:
        * constructor option
        * @data-options attribute on the container <div>
        * Default

    * [c] Set the actual diagram's root, ec_state, and src_node from:
        * constructor option
        * q.s. param
        * @data-options attribute on the container <div>
        * Default

    * [c] Set all the other option values on the diagram according to:
        * constructor option
        * @data-options attribute on the container <div>
        * Default

* [c] Register the popstate handler - this is a global, there's only one of
  these.

* Read the dtd json, then create the tree of nodes
    * initialize_root() - root_node, from a fake spec
    * expand per the ec_state
    * set the src_node property from the address

* Call history.replaceState, to set a state object for this history item.
  Need to merge this -- there might be other diagrams' states already in
  the state variable

***When we get a popstate event***

If the state object matches, then we'll seamlessly
transition to the new state. Otherwise (for example, after the user has refreshed
the page) we have no choice but to reinitialize
the whole tree. This will make transitions jumpy. It *would* be possible, through 
very fancy manipulations, to store everything we need in the URL, but that would
have the drawback that a given tree display (i.e. a given root node name and ec-state)
would no longer have a unique q.s. string value -- there would be multiple ways to
get to that display. That's undesirable.

* Parse the URL query string into an object
* Get the state object
* For each diagram:
    * Figure out what the new ec_state will be, from:
        * q.s. param, if there is one
        * Initial value from construction
    * If the state object uid matches, ***no need to reinstantiate the tree***.
        * Set the ec_state
        * Set the root and the src_node based 
          on the ids in the state object
    * Otherwise:
        * Figure out what new root_name and src_node_name are, from:
            * q.s. param, if there is one; or
            * Initial values used in the initial construction (see above)
        * Create a new tree of nodes, starting with initialize_root(), 
        * expand per the ec_state
        * set the src_node property from the address

***Any user event***

* The src_node is the node the user clicked on
* If rebase, then update the root node; expand its content if it's completely
  collapsed
* If expand/collapse button, update expand/collapse state
* Compute the new q.s. param, and merge this into the other diagrams', to 
  create the new URL
* history.pushState()
* diagram.update()

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
