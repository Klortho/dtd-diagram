* [c] get viewport scrolling to work again
* [c] promise-ize all transitions, again.
* [c] Error handling
* Bug in scrolling: after I've resized the div to make it bigger, then the
  scrollleft (and probably scrolltop, too) doesn't take into account the new
  size. When I make the drawing wide, and then collapse a node such that it
  gets narrower, the scrollleft doesn't tween to its proper new location.
* Make inheritance from Node the same as inheritance from any of the other 
  mixins.
* Any other options cleanup? Things that shouldn't be options, that can be 
  moved into the class files?
* Look for FIXMEs
* Get rid of jQuery
* Fix links to documentation
* productize it 
    - build script to combine and minimize

