* [c] Implement a label-width computer:
    * Keep a cache of all labels seen so far (attached to the diagram)
    * If you get a new one:
        * instantiate the DOM element, invisibly
        * read and cache the width
        * destroy the DOM element


* [c] Refactor transitions: let's massively simplify, but just doing a single
  transition / node, on the scale of the <g>
    * [c] Let's add that first
    * [c] Then remove the old ones.
    * [c] Add exit transition to shrink the <g>
    * [c] Get rid of other exit transitions


* Implement inheritance through mixins:
    * Rename my classes to exactly match the types:
        * ElementNode
        * AttributeNode
        * ChoiceNode
        * SeqNode
        * OtherNode
    * Mixins:
        * boxed - Nodes that are drawn with rounded-rectangle boxes. These all
          have a name, and a width that depends on the rendered length of that
          name string
        * has_q

* promise-ize all transitions, again.


* Cowbell
    * All the text for a given node type should be the same color, incl.
      q and label
    * Each node type should be a different color, except maybe choice/seq
    * Maybe also shrink the corner radii of ElementNodes, and make AttributeNodes'
      boxes oval.
    * Fix sequence node shape
    * Use SVG to draw q
    * Use SVG to draw button labels "@" and "<>"
    * diagonals should come right out of their buttons: i.e. source vertical
      coord should depend on button loc.

* Get rid of jQuery

