* Bug in scrolling: after I've resized the div to make it bigger, then the
  scrollleft (and probably scrolltop, too) doesn't take into account the new
  size. When I make the drawing wide, and then collapse a node such that it
  gets narrower, the scrollleft doesn't tween to its proper new location.
* Look for FIXMEs
* [c] Fix links to documentation
* [c] You should be able to pass in a function to generate documentation hyperlinks
* [c] Get it to work well with JATS -- use that as the demo

* Add "rebase" feature: a tabbed corner on the upper left
* In the demo page, make the base node be selectable by a fragment string.
  Maybe, when the user "rebases", cause that by default to change the fragment

* Make colors options

* Test the various ways it can be kicked off - make sure there are no timing issues.
* productize it 
    - build script to combine and minimize
