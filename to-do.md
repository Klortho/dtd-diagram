* Test the various ways it can be kicked off - make sure there are no timing issues.
- Need build script to combine and minimize
* Add "fork me on github" banner, page titles, etc.

## Package and deploy


### dtd-diagram

* Use the cloudflare CDN for d3 -- don't ever download it
* Set up a npm package.json file 
    * I think this is where I can download random dependencies; see
      the setup file


* Set up a gulp build script





### d3-flextree





* Integrate bower, and get it into the bower registry




* Get d3-flextree onto [jsdelivr 
  CDN](https://www.jsdelivr.com/free-open-source-cdn/javascript-cdn), then update
  the files here.




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

## To do last


* Look for FIXMEs
