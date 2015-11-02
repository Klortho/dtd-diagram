# To do

* Figure out how to manage deploying the final build products
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
          locally and remote.
        * It is not ideal, because doesn't satisfy all the nice-to-haves above.
    * Whatever I come up with here should be back-ported to d3-flextree.


* Get the forward button to work, on simple expand/collapse state changes
* Test on other browsers
    * Resizing the svg doesn't seem to work on FF
* Attributes should be collapsed by default. Make it an option.
* Enhancement: optimize/simplify some drawings: 
  * "choice-of-one" and "seq-of-one" can be removed: see front/notes;
    combine the 'q's intelligently
  * If seq is the only child, and no q, remove it
* For an element that takes just #PCDATA, change the content button to a
  green-tinted "C"
* On the demo page, put, side-by-side, images of the old near-and-far versions
