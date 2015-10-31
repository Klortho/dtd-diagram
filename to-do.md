* [c] Fix links to documentation
* [c] You should be able to pass in a function to generate documentation hyperlinks
* [c] Get it to work well with JATS -- use that as the demo

* [c] Add "rebase" feature: a tabbed corner on the upper left
    * First add the function and test it from the console. How will it work?


* [c] Rebasing
    * [c] In the demo page, make the base node be selectable by a fragment string,
      when the page first loads
    * [c] When the user "rebases", cause that to change the fragment
    * [c] Can I add it now, and add it to the page history?
    * [c] What to do about q, when rebasing? It needs to be deleted, and the
      element redrawn.

* [c] If the user gives a bad element name for root, we shouldn't draw anything.


* Look for FIXMEs
* Make colors options
* Test the various ways it can be kicked off - make sure there are no timing issues.
- Need build script to combine and minimize
* Get d3-flextree onto [jsdelivr 
  CDN](https://www.jsdelivr.com/free-open-source-cdn/javascript-cdn), then update
  the files here.
* Add "fork me on github" banner, page titles, etc.

## Bugs

* Tiny bug: when shrinking, sometimes the scroll value
  will not change. Right now, this means the canvas will get resized right
  away. (It waits until scrolling is done, but not until the end of the 
  animation.) So, the boxes that start out outside the
  new canvas size will be suddenly clipped at the start of the animation.
    - To fix this, we'd need to turn at least one animation into a promise,
      and wait for that. We could use that instead of the scrolling promise,
      since they should all be done at the same time. But, a more robust
      way would be to have all animations be promises, and then do a 
      Promise.all() at the end.

* Bug in scrolling: after I've resized the div to make it bigger, then the
  scrollleft (and probably scrolltop, too) doesn't take into account the new
  size. When I make the drawing wide, and then collapse a node such that it
  gets narrower, the scrollleft doesn't tween to its proper new location.
