# Interactive, animated DTD schema diagrams

This is a D3 implementation of the old XML
Near & Far diagrams. See this [Key to the Near & Far 
Diagrams](http://jatspan.org/niso/publishing-1.1d3/#p=nfd) and the
following pages, for examples of what Near & Far diagrams look like.

See a demo [here](http://klortho.github.io/dtd-diagram/examples/).

To run from your own machine:

* Clone the repo under a directory that is served by a web server.
* Run `./setup` to fetch some dependencies (this is really only needed if
  you are using IE)
* Bring up examples/index.html in a browser.


To generate JSON versions of DTDs:

* Run `./setup.sh`, if you haven't already,
* Install 
  [DtdAnalyzer](http://dtd.nlm.nih.gov/ncbi/dtdanalyzer/)
* Generate the JSON. For
  example:

    ```
    cd examples
    dtdanalyzer --xslt ../daz2json.xsl dtd.dtd > dtd.json
    dtddocumentor dtd.dtd
    ```

To configure this to work with one of the JATS DTDs, you could do this:

```
cd examples
dtdanalyzer --xslt ../daz2json.xsl \
  http://jats.nlm.nih.gov/archiving/1.0/JATS-archivearticle1.dtd \
  > JATS-archivearticle1.json
```

Then, in the HTML file that invokes the diagram, set options to 
load the correct DTD JSON file, and to
cause documentation hyperlinks to go to the right place.
(see *examples/jats-1.1d3.html*):

```
<div id='dtd-diagram'
     data-options='{
         "dtd_json_file": "JATS-journalpublishing1.json",
         "tag_doc_url": "http://jatspan.org/niso/publishing-1.1d3/#p="
     }'></div>
```



# To do

* Add attributes
* Work on the sample DTD to make sure it covers all cases
* Auto-adjust column widths, based on the rightmost edge of any node in that column
* Corollary: expand the compound node's width proportionally to its height.
* Add a "re-root" link somewhere on each node. Clicking that causes the whole
  tree to be redrawn, with that node now at the root.
* More cowbell.
    - Colors
    - Maybe use a greek cross for the expander, rather than a rectangle
    - How about a diamond shape for choice (reminiscent of flowcharts) and 
      a horizontal ellipsis for sequence?
    - Tweak how the `q` symbols look, esp. on the compound nodes

* Add "fork me on github" banner, page titles, etc.

* Create an index.html page that links to the various examples.

* Why didn't I get my error message from 
  http://klortho.github.io/dtd-diagram/examples/jats-1.1d3.html?

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


# API

The simplest way to use this is to load the code in a page that has a 
pre-existing `<div>` element with `id` value "dtd-diagram". For example:

```html
<head>
  ...
  <link rel="stylesheet" type="text/css" href="dtd-diagram.css">
  <script type='text/javascript' src='es6-promise.js'></script>
  <script type='text/javascript' src='jquery.min.js'></script>
  <script type="text/javascript" src="d3.min.js"></script>
  <script type="text/javascript" src="dtd-diagram.js"></script>
  ...
</head>
<body>
  ...
  <div id='dtd-diagram'></div>
  ...
</body>
```

By default, if you include the JavaScript in your HTML page, then a DtdDiagram
will be instantiated at document ready, using all the default options.
If you want to prevent this behavior, then set auto_start to false, before
document ready. This will let you control when a diagram is created, based on, 
for example, user events. For example:

```html
<head>
  ...
  <script type="text/javascript" src="dtd-diagram.js"></script>
  ...
</head>
<body>
  ...
  <div id='dtd-diagram'></div>
  <input id='button' type='button' />
  ...
  <script type="text/javascript">
    DtdDiagram.auto_start = false;
    ...
    $('#button').on("click", function() {
      new DtdDiagram();
    };
  </script>
</body>
```

If you create your own diagram object before 
document ready, that will also suppress the auto-creation. This allows you
to easily override default options. For example,

```html
<script type="text/javascript" src="dtd-diagram.js"></script>
<script type="text/javascript">
  new DtdDiagram({
    duration: 5000,
  });
</script>
```

Set options on the `<div>` element, in the `data-options` attribute, in
valid JSON format.

```html
<div id='dtd-diagram'
     data-options='{"root_element": "back"}'>
</div>
```

You can get a list of all of the diagrams on a page from `DtdDiagram.diagrams`.


# Generating the JSON

Use dtdanalyzer,


# Managing geometry

The geometry of the display is captured by several separate Box objects, 
with each box recording top, bottom, left, and right in the SVG
coordinate system.

The variable names for these use one of "drawing", "canvas", or "viewport".
If the name does not have a prefix, it means the *previous*
state, before the click. If it has the prefix "new_", it means the
state after the click. Here they are:

- `new_drawing`: the current extents of the drawing
- `canvas`, `new_canvas`: normally, this is the same as the drawing; but if the 
  drawing is below a minimum canvas size, this will take that minimum size.
- `viewport`, `new_viewport`: same size as the minimum canvas size, but it moves 
  around.


# Data models

The DTD data and the display tree data are held in a separate data structures. 
This is necessary, because a given element might appear in several places in the
tree, and might be expanded in some places but collapsed in others.

The content model of an element can be quite complex, and is, in general, 
a hierarchy itself (a sub-tree of the main tree).

See for example:

* [<journal-meta>](http://jatspan.org/niso/publishing-1.1d3/#p=nfd-journal-meta) -
  note the sub-sequence starting with contrib-group
* [<name>](http://jatspan.org/niso/publishing-1.1d3/#p=nfd-name) - note
  the sub-hierarchy with surname and given-names

A "compound node" is defined as on of the `choice` or `seq` nodes within the
complex content model of an element.

From the perspective of the D3 tree layout engine, however, a compound node is 
just a flattened bag of simple nodes. I.e., when we pass the tree to the layout 
engine, we need to hide any given content model's complex nature. That way, 
the simple leaf nodes for that element's content model will be placed in the
correct vertical positions.

Horizontally, a compound node still must fit into a single column. This might
be a problem for very complex content models.


## Complex content models

There are two types of nodes. Use node.is_simple() to determine the type
of any given node. The types are:

1. simple - have `name`. These correspond to an element or attribute, and 
2. compound - have `type` (either `seq` or `choice`). These are
   part of a complex content model in the DTD. 

We maintain two separate trees at the same time:

1. children/_children - just the tree of the simple nodes. This is used by
   the D3 tree layout routines for positioning
2. cm_children - this tree includes all compound and simple nodes


## Simple nodes data members

- Data that we create/maintain:
    * name
    * q
    * children - if the node is expanded, this is an array of pointers to
      the *simple* node children (not the compound children).
    * _children - stores the kids when the node is collapsed
    * cm_children - array of simple nodes and/or compound nodes
    * width - based on the text content
    * x0, y0 - holds the old position. This is used as the starting point
      for transitioning (when creating new child nodes, for example)
    * id - this is added when binding the data, and ensures that the same
      data nodes are bound to the same SVG elements each time. The value here
      is also used as the id attribute of the text SVG element, and the
      data-id attributes of the two rect SVG elements.

- Created by the D3 tree routines:
    * depth
    * x, y
    * parent

## Compound nodes data members

* type - one of "choice", "seq", etc.
* q
* cm_children - array of simple nodes and/or compound nodes
* x, y



# Credits / references

* Liam Quinn, W3C. See his paper, [Diagramming XML:
  Exploring Concepts, Constraints and 
  Affordances](http://www.balisage.net/Proceedings/vol15/html/Quin01/BalisageVol15-Quin01.html), 2015.
* D3, see [this example](http://bl.ocks.org/mbostock/4339083).




# License

<a href='http://www.wtfpl.net/'><img src='https://raw.githubusercontent.com/Klortho/dtd-diagram/28476aa90574bbedef999d8f88b0ead9dac2a819/wtfpl-badge-1.png'/></a>

See [LICENSE.txt](LICENSE.txt).

