# Interactive, animated DTD schema diagrams

See [the demo](http://klortho.github.io/dtd-diagram/).

This is a D3 implementation of the old XML
Near & Far diagrams. See this [Key to the Near & Far 
Diagrams](http://jatspan.org/niso/publishing-1.1d3/#p=nfd) and the
following pages, for examples of what Near & Far diagrams look like.

To run from your own machine, you can use Bower, and add this as
a dependency:

```
bower install dtd-diagram --save
```

Or, you download it and its dependencies manually:

* [dtd-diagram.min.js](https://raw.githubusercontent.com/Klortho/dtd-diagram/0.1.0/dist/dtd-diagram.min.js)
* [dtd-diagram.min.css](https://raw.githubusercontent.com/Klortho/dtd-diagram/0.1.0/dist/dtd-diagram.min.css)
* [es6-promise.min.js](https://cdnjs.cloudflare.com/ajax/libs/es6-promise/3.0.2/es6-promise.min.js)
* [d3.min.js](https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.6/d3.min.js)
* [d3-flextree.js](https://raw.githubusercontent.com/Klortho/d3-flextree/1.0.1/dist/d3-flextree.min.js)


To integrate it with your own DTD, you'll want to clone it and
initialize a development environment, which includes DtdAnalyzer,
used to convert DTDs into the JSON files that this tool consumes.

Make sure you have Node.js and npm installed, and then install gulp 
globally (if you haven't already). This makes the `gulp` command available
on the command line:

```
npm install -g gulp
```

Then clone the repo, and build it:

```
git clone https://github.com/Klortho/dtd-diagram.git
cd dtd-diagram
npm install
gulp
```

Check that it worked, by bringing up the project folder in a web browser.

To generate JSON versions of DTDs, you'll need to set your PATH
to include the vendor/dtd-analyzer directory, and then,
for example, for the test DTD:

```
dtdanalyzer --roots doc --xslt daz2json.xsl test/test2.dtd > test2.json 
```

To work with one of the JATS DTDs, you could do this:

```
dtdanalyzer --roots article --xslt daz2json.xsl \
  http://jats.nlm.nih.gov/publishing/1.1d3/JATS-journalpublishing1.dtd \
  > JATS-journalpublishing1.json
```

Then, in the HTML file that invokes the diagram, set options to 
load the correct DTD JSON file, and to
cause documentation hyperlinks to go to the right place.
(see the index.html page for an example):

```
<div id='dtd-diagram'
     data-options='{
         "dtd_json_file": "JATS-journalpublishing1.json",
         "tag_doc_base": "http://jatspan.org/niso/publishing-1.1d3/#p="
     }'></div>
```

To work on the JavaScript modules, and have gulp watch for changes, and 
automatically build the combined, minified files, start a watcher in a terminal
with:

```
gulp watch
```

# API

The simplest way to use this is to load the code in a page that has a 
pre-existing `<div>` element with `id` value "dtd-diagram". For example:

```html
<head>
  ...
  <link rel="stylesheet" type="text/css" href="dtd-diagram.css">
  <script src='es6-promise.js'></script>
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
If you want to prevent this behavior, then set `auto_start` to `false`, before
document ready. This will let you control when a diagram is created, based on
(for example) user events. For example:

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

You can also set options on the `<div>` element, in the `data-options` attribute, in
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

**tag_doc_base**

Used as the base URL for links from the element and attribute nodes
to documentation. Default is "doc/#p=".

**tag_doc_url**

By default, this is not used. You can set this to a function that takes
a Node object as an argument, and returns a string with the URL of
the documentation page.

**min_canvas_width**, **min_canvas_height**

Initial value for the diagram's size.

**group_separation**

Ratio of the separation between groups to the separation between sibling nodes.
By default, this is 1.4.

**duration**

Duration of the animation, in milliseconds. Default is 500.

**rebase_handler**

You can set this to a callback function that will be invoked whenever the user
rebases the diagram.
```



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
  





# Credits / references

* Liam Quinn, W3C. See his paper, [Diagramming XML:
  Exploring Concepts, Constraints and 
  Affordances](http://www.balisage.net/Proceedings/vol15/html/Quin01/BalisageVol15-Quin01.html), 2015.
* D3, see [this example](http://bl.ocks.org/mbostock/4339083).


# License

<a href='http://www.wtfpl.net/'><img src='https://raw.githubusercontent.com/Klortho/dtd-diagram/28476aa90574bbedef999d8f88b0ead9dac2a819/wtfpl-badge-1.png'/></a>

See [LICENSE.txt](LICENSE.txt).

