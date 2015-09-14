* [c] Change it so that every node has a `type`, which is either "element", "attribute",
  "seq" or "choice"
* [c] Flatten the top-level sequence node of a content model.


* Strategy: 
    * Turn existing "compound nodes" into real tree nodes, and compute the
      layout tree with those. cm_mung will now cause a lot of overlapping
      problems, presumably.
        - This will get rid of the concept of "cm_children"
    * Get rid of cm_mung

* What is the real width function?