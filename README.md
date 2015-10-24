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
* Generate the JSON. For example, for the test DTD

    ```
    cd examples
    dtdanalyzer --roots doc --xslt ../daz2json.xsl test2.dtd > test2.json 
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

* "mixed" content models
* Implement attributes
* Work on exit transitions
* Change the style of the expander buttons depending on whether or not
  they are expanded. Could I use some kind of actual button style there?
* Get d3-flextree onto [jsdelivr 
  CDN](https://www.jsdelivr.com/free-open-source-cdn/javascript-cdn), then update
  the files here.
* Automate build process to combine modules
* After I get it completely working, change the default index.html page to render 
  the JATS DTD, for demo purposes. 

## Other

* Work on the sample DTD to make sure it covers all cases
* Add a "re-root" link somewhere on each node. Clicking that causes the whole
  tree to be redrawn, with that node now at the root.
* Add "fork me on github" banner, page titles, etc.
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
  <script src='es6-promise.js'></script>
  <script src='jquery.min.js'></script>
  <script src="d3.min.js"></script>
  <script src="d3-flextree.js"></script>
  <script src="dtd-diagram.js"></script>
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

## Options

There are various ways to set the options; in order of 
higher-to-lower precedence:

- Pass them as an object to the DtdDiagram constructor function.
- Set them on the @data-options attribute of the &lt;div>
  element. Make sure they are in strictly valid JSON format.
- Use the defaults


**dtd_json_file**

The DTD JSON file; default is "dtd.json".


**root_element**

The root element, by default, is read from the DTD file, but can
be overridden. Default is null.

**tag_doc_url**

Default is "doc/#p=".

**node_width**

FIXME: this will change to font-size and left- and right- padding.
Or -- can these all be css settings?

Nominal width of a node. Default is 210.

**node_height**

FIXME: same as above.

Default is 32.

**choice_seq_node_width**

FIXME: same as above.

Default is 18.

**diagonal_width**

FIXME: same as above.

Default is 20.


```
      // Minimum size of the drawing in terms of tree-node rows and
      // columns. "rows" is a nominal concept. The actual # of nodes 
      // you see vertically depends on spacing between 
      // non-sibs, etc.
      min_num_columns: 4,
      min_num_rows: 10,

      // Dimensions of the rectangles used to draw the nodes
      node_box_height: 25,
      node_expander_width: 10,

      scrollbar_margin: 20,
      dropshadow_margin: 5,

      // Ratio of the separation between groups to the separation between sibling nodes
      group_separation: 1.4,

      // Duration of the animation, in milliseconds.
      duration: 500,
    };
```

**test_file**

Use a pre-layed-out test file, for testing. Default is *null*.
This is exclusive with **dtd_json_file**.



# Generating the JSON

Use dtdanalyzer ....


# Implementation

## Managing geometry

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


## Data models

The DTD data and the display tree data are held in a separate data structures. 
This is necessary, because a given element might appear in several places in the
DTD, and might be expanded in some places but collapsed in others.

The content model of an element can be quite complex, and is, in general, 
a hierarchy itself (a sub-tree of the main tree).

See for example:

* [&lt;journal-meta>](http://jatspan.org/niso/publishing-1.1d3/#p=nfd-journal-meta) -
  note the sub-sequence starting with contrib-group
* [&lt;name>](http://jatspan.org/niso/publishing-1.1d3/#p=nfd-name) - note
  the sub-hierarchy with surname and given-names




### Node class

Attributes that we create/maintain:

* name
* type - one of "element", "attribute", "choice", or "seq"
* q - from the DTD, either null, '?', '*', or '+'
* children - if the node is expanded, array child Nodes
* _children - stores the kids when the node is collapsed
* diagram - the diagram to which this Node belongs
* elem_parent - the nearest ancestor Node of type `element`. This is used
  by the `separation` function -- all nodes with the same `elem_parent`
  are considered part of the nuclear family, and spaced close together
* width - computed by aggregating the widths of the parts. Doesn't include the
  diagonal -- this is used to compute the y coordinate for the "source" of the
  diagonal.
* x_size, y_size - includes everything (except the separation)
* x0, y0 - holds the old position. This is used as the starting point
  for transitioning (when creating new child nodes, for example). x0 is
  the vertical coordinat, y0 the horizontal
* id - added when binding the data, and ensures that the same
  data nodes are bound to the same SVG elements each time. The value here
  is also used as the id attribute of the `text` element that renders the
  `name`, and the data-id attributes of the other SVG elements associated
  with this Node.

Created by the D3 flextree layout engine:

* depth
* x, y
* parent
* x_size, y_size


### DtdDiagram class

Class attributes:

* diagrams - list of all the DtdDiagram objects
* auto_start - set this to `false` before document ready to prevent it from
  auto-instantiating a DtdDiagram.
* document_ready - a Promise that's resolved with document is ready.
* default_options

The instance attributes are the following.

Active option values

* dtd_json_file
* test_file
* root_element
* tag_doc_url
* min_canvas_width
* min_canvas_height
* node_text_margin
* node_height
* node_box_height
* choice_seq_node_width
* q_width
* button_width
* diagonal_width
* scrollbar_margin
* dropshadow_margin
* group_separation
* duration

Other

* container_d3 - D3 reference to the containing `div`
* container_dom
* container_jq
* diagonal - the D3 diagonal generator
* dtd_json - json object from reading dtd_json_file. null if we're using test_file.
* engine - the d3.flextree layout engine
* error - either `false` or a string error message
* last_id - used to set unique IDs on each node
* opts - the options passed into the constructor (these are merged with options
  specified elsewhere)
* root - the root Node
* svg - D3 reference to the `svg` element
* svg_g - D3 reference to the `g` element child of `svg`.

Attributes used during transitioning:

* src_node - the node that the user clicked on, used when we're doing 
  transitions
* new_drawing
* canvas
* new_canvas
* viewport
* new_viewport
* embiggenning - true if the drawing is getting larger; false otherwise



# Credits / references

* Liam Quinn, W3C. See his paper, [Diagramming XML:
  Exploring Concepts, Constraints and 
  Affordances](http://www.balisage.net/Proceedings/vol15/html/Quin01/BalisageVol15-Quin01.html), 2015.
* D3, see [this example](http://bl.ocks.org/mbostock/4339083).




# License

<a href='http://www.wtfpl.net/'><img src='https://raw.githubusercontent.com/Klortho/dtd-diagram/28476aa90574bbedef999d8f88b0ead9dac2a819/wtfpl-badge-1.png'/></a>

See [LICENSE.txt](LICENSE.txt).

