# graph-strata

A web-based 3D graph visualization using THREE.js

## installing

Install necessary npm packages by running: `npm install`

If you want to use the C++-based sparsenet tools (currently, only needed if you use the sparsenet tool from the client), you also need to compile the C++ sparsenet code in bin/algorithm.cpp, and also rename a copy of the executable as sparsenet_approximate(or sparsenet_approximate.exe if on Windows).  See bin/compiling.txt for compiling notes.



## running the server

The server (app.js and datasets.js) does three things: preprocess plain text (CSV,TSV etc) edgelist files, serves the webpages and processed data files, and saves some visualization data (like node layouts) so they can be reused. The basic command is:

 `node app.js (and optional arguments, se below)`

 (On Linux, to run the server after the terminal is closed, you can use `nohup`, for example `nohup node app.js <arguments>`)

### loading data from external URLs

If you don't want to preprocess data, and instead only want to use the client to visualize graph data (in text formats like CSV) directly from some external URL, just run `node app.js` and access the webpage at the default port (for example localhost:3010), and follow **using the client** below. A data/ directory is there for your convenience but you don't have to put anything in it. Note: some visualization caches (like node layouts) will be saved in the temp directory (default is temp/), even if you don't use preprocessed data, so you may want to specify a temp directory.

### preprocessing data

If you want to preprocess data files to use the client to navigate a hierarchy of decomposed data: first put all edgelist text files in a directory (default is data/), and choose a temporary data directory for preprocessed files (default is temp/, will be created if not present). Pass these paths in the arguments, and run the command with arguments you need, for example `node app.js data=data2 temp=temp2 port=8000`. And they will be automatically processed. And if there are datasets larger than about 100MB, you may need to increase the Node.js memory limit like this: `node --max-old-space-size=<memory in MBs> app.js <other arguments>` because the default Node.js memory limit may be too tight.

The text data files can be CSV, TSV, or space-separated (will be auto-detected). Each line should have 2 rows, source and target, which become vertex IDs. Extra columns are ignored. A header line (must be first line is present) with column names including source and target is allowed (and can be used to control which columns are treated as the source and target), but other kinds of comments are not understood. Each file is treated as one dataset and its filename(ignoring extensions) will be the dataset name for UI purposes.

Server command-line arguments:
- data=(...): specifies the data files directory. Can be a relative or absolute path.
- temp=(...): specifies the temp files directory. Can be a relative or absolute path, and will be created if nonexistent. The temp directory stores preprocessed data as well as cached visualization data like node layouts and sparsenets, so even if you don't use preprocessed data, you may want to specify one.
- port=(...): overrides the default port(3010) defined in the beginning of app.js.
- noDerived: (no "=value" part) means to disable checking preprocessed files to see if they are up to date, except for the most basic files for each graph like top level vertex IDs and edges. Effectively disables generating and refreshing all derived data, including the subgraphs hierarchy. Can make startup much faster for large datasets if you know the derived data has been generated before and is up-to-date, or if you just want top-level graphs. (Was called noLoad in older versions.) The reason why the server checks all subgraph files by default is because in development I often needed to update the code that generates subgraphs and other derived data, and need to delete and regenerate them and all their dependencies.
- refreshCache=(cachename1,cachename2:time_in_minutes,...): specifies a comma-separated list of cache names (caches are how preprocessed files are organized, see datasets.js for cache definitions) to force-refresh all of them and their dependencies(at all levels of the hierarchy where they exist). To deal with the situation where there's not enough memory to refresh all of one kind of cache, you can specify only to refresh if the cache is older than some time, eg. 5 minutes (since the time when the whole processing started).  so instead of <cache>, <cache>:<number> means only refresh if it's older than <number> minutes.


## using the client

The web app supports Firefox and Chrome. Navigate your web browser to the URL of the web app (like http://<your server>:<your chosen port>).

If you use preprocessed data, you can choose a dataset from the list that is displayed.

If you use data from external URLs only, there will not be datasets to choose from, so you will need to pass parameters in the URL to control what the app does. (You can also use some of these parameters if you use preprocessed data, or skip the preprocessed data by specifying external URLs.)

The URL parameters will be part of the URL, like this: `http://<your server>:<your chosen port>/?<param1>=<value1>&<apram2>=<value2>`. Note that if the value includes special characters (like greater-than or less-than) it needs to be escaped. In JavaScript you can escape a string with: `escape(s)` and unescape with: `unescape(s)`.

List of useful URL parameters:

**loading-related**
- dataPath=(...): If the parameter `dataURL` is not present, it will make the app navigate to this data path directly in the preprocessed data. If the parameter `dataURL` is also present, it will treat the data loaded from that URL as if it has this data path(useful for displaying a meaningful graph name). The data path (or derivation path) is a path-like notation to describe how a graph is derived in the hierarchy; for example, my_dataset/layers/1 means this graph is the layer 1 (subgraph ID 1 of the type "layers") of the top level dataset my_dataset. This also affects the displayed graph name in the UI, and affect where node layouts are cached in the temp directory - the layout can be reused if a cached layout has the same data path.
- dataURL=(URL): loads an edgelist text file () at this URL and visualize the graph. The file can be CSV, TSV or space-separated, and each line has a source and a target(string vertex IDs). Loading other property columns can be controlled further with other parameters.
- propertyColumns=(JSON): representing an object where keys are column indices in the edgelist file from dataURL and values are names of the columns(normally 0 and 1 are source and target if unspecified, but you can remap them too). Example: `{"2":"weight"}`. The type is integer(Int32) by default.
- verticesDataURL=(URL): loads a text file for vertices at this URL. By default the first column is vertex IDs (correspond to the source and target in the edgelist); this can help adding degree-0 vertices. Other property columns can be controlled further with other parameters.
- verticesPropertyColumns: representing an object where keys are column indices in the vertices file from verticesDataURL and values are names of the columns(normally 0 is the vertex ID if unspecified, but you can remap it too). Example: `{"1":"layer"}`. The type is integer(Int32) by default.
- ignoreUnknownVertices=(true or false, default is false):if you need to load a vertex list for useful properties but don't want the vertices not already mentioned in your edges (considering edge filtering), then set this to true.
- extraProperties=(JSON): a JSON array where each entry is an extra file to load, to provide properties not in the base files. An entry is an object like {URL:...,owner:vertices,name:...}, where the URL points to a JSON file that organizes vertex IDs into sets like {"1":["v1","v2"]}
- filters=(JSON): use edge filters (vertex filters are not supported yet). The value is an array where each item is a string that will be evaluated into a function, for example `["(x)=>x.weight>10"]`. Note: this JSON string often needs to be escaped because of the special characters.
- dataURLFunc=(string that will be evaluated into a function): advanced; used for faking a hierarchy. The function creates dataURLs from dataPaths so graphs at other logical paths know where to load the data - the new dataPaths would come from navigation rules from the current graph, often a metagraph. Escape the string if needed.
- extraGraphs=(JSON): advanced, used for faking a hierarchy. Injects other graphs into the client's known hierarchy so they can be used for navigation. Can be an array(each entry should have a dataPath) or an object (where keys are dataPaths).


**visualization-related**
- minimalUI=true: use the new cleaner UI.
- nodeColor=(JSON): an object like {"r":0.5,"g":0.5,"b":0.5}; forces this color on all nodes.
- nodeColorProperty=(name): specifies which property determines the nodes' colors. By default link colors will be interpolated from node colors.
- colorScaleName=(name): specify a named color scale (see public/js/G-view.js for definitions). Meant to be used with nodeColorProperty.
- colorScale=(begin:end): specify a custom color scale, where begin and end are HSL color strings (parsed with D3), like `hsl(...,...,...)`.
- heightProperty=(name): which property determines the height. If edges have this property name, it will be edges-based (shown as an edge-decomposition with clones). Otherwise it will be vertex-based (no clones).
- heightPropertyTypeHint=(vertices or edges): if you need to specify whether it's a vertex property or edge property.
- representation=(metagraph type, or "null"): specifies which metagraph to draw instead to represent it. If null, forces drawing the graph itself(default is automatically choosing a metagraph that's not too big).
- algorithm=(name): executes the algorithm (as if using the "algorithm" menu from the UI); disables representation too because otherwise there would be a conflict.
- dimBelowHeight=(number): a shorthand for dimming below a height (the number is the value threshold for the current height-determining vertex or edge property, not absolute height in 3D space).

There are also other parameters that directly control modifiers. If a parameter name matches the name of one of the modifiers in the system (the tools you can use via View Tools or Subview Tools menus), the value will be parsed as JSON and used to initialize that tool (a modifier on the styles). Examples: nodeColor and DAGCover. (see G-view.js and G-subview.js for modifiers definitions and their parameters). This is so that you don't need to add special parsing for a mew parameter when you add a style-modifying tool.



### UI operations and shortcuts

Besides the menus and buttons, there are keyboard shortcuts:

- space: pause/unpause
- L: show/hide labels (showing labels will pause the layout)
- $: save the layout (horizontal node positions only) on the server so it can be reused when the same graph (judging by data path) is displayed next time
- \`: shows the advanced options(obsolete, but you can only access some menus from it, like the graph edgelist input dialog)
- WASD: moving the camera horizontally.
- arrow keys: moving the selected nodes (you can also drag them with the mouse though)



---------------

Please report any bugs and issues.
