* Bookmark drawing state, every time it changes
    * Turn the "rebase" callback into a state change callback

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