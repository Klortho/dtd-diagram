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
* [c] Get rid of jQuery
* Fix links to documentation
* Get it to work well with JATS -- use that as the demo
* Test the various ways it can be kicked off - make sure there are no timing issues.
* productize it 
    - build script to combine and minimize

