# Atlas Edge Decomposition Algorithm + Waves decomposition

This is the fast, scalable implementation of [edge decomposition based on fixed points of degree peeling][edge-decomp] used in [Atlas][atlas].
This also includes the implementation for further decompositions of the peel layers into waves.

## Installation

Download or clone this repository.

```bash
git clone https://github.com/DanManN/atlas-algorithm.git
```

From the directory, compile the code by running make.

## Data Directory Structure

For each dataset you want to decompose create a subdirectory with the name of
the data set and a put an edge list in that subdirectory with the with the same
name as the directory with a txt extenstion. Also in that same subdirectory
create two subdirectories with the graph name followed by an underscore '\_',
one followed by 'layers' and the other by 'waves'.

For example, for a dataset called simplegraph the directory structure should look like:

```
simplegraph/
simplegraph/simplegraph.txt
simplegraph/simplegraph_layers
simplegraph/simplegraph_waves
src/
Makefile
```

## Data Sanitation

Input text files should be tab separated where each row contains a `source` and
`target` (these must be numbers).

We sanitize the data to remove:

* self-loops / self-edges
* duplicate edges (multi-graph)
* edge weights

To perform the sanititation run:

```bash
make GRAPH=dataset_name sanitize
```

replacing dataset\_name with the name of your data set as per the directory
structure.

If the dataset you are analyzing isn't an undirected format (meaning each edge
(u,v) in the edgelist also has an accompanying edge (v,u)) than run the
following command to convert to an undirected format:

```bash
make GRAPH=dataset_name union
```

## Decompositions

Once the dataset is sanitized and converted to the proper format you can run
the following decompositions.

**Note*:** The wave decomposition requires that the peel layer decomposition
has already been run first.

### Peel Layers

To decompose the graph into peel layers run:

```bash
make GRAPH=dataset_name decomp
```

This will output files named `layer-X-Y.csv` into the layers subdirectory
containing the edges of layers X through Y whenever the write-out buffer is
filled up.  If an individual layer is bigger than the write-out buffer than it
will be written to a file called `layer-X.csv`. The decomposition also outputs
a `dataset_name-decomposition-info.json` file that contains metadata for the
running of the decomposition and the graph and a `dataset_name-layer-info.json`
containing the metadata of each layer.

### Waves

This requires the peel decomposition to have been run as this decomposition is
applied to layers only.  To run the wave decomposition on layer number X run:

```bash
make GRAPH=dataset_name LAYER=X dwave
```
This will output four files into the waves subdirectory:

- `layer-X-waves.csv` with the format:
`vertex_id, level_number, wave_number, wave_connected-component, meta_node_id`
- `layer-X-metaedges.csv` with format:
`source_metanode, target_metanode`
- `layer-X-waves-info.json` containing wave metadata
- `layer-X-wavedecomp-info.json` containing the decomposition metadata

Additionally if you want to automatically compute the waves of layer-connected components
that are bigger than 2^14 edges you can run:

```bash
make GRAPH=dataset_name waves
```

### Connected Components

To find the connected components of the entire dataset run:

```bash
make GRAPH=dataset_name ccs
```
This will output a file called `datase\_name.cc` with a list formated as `vertex,
connected_component_id`. This will also output a file called
`dataset_name.cc-decomposition-info.json` containing metadata for this computation as well as a
file called `dataset_name.cc-info.json` with metadata for each connected component in the graph.

To find the connected components of a layer run:

```bash
make GRAPH=dataset_name LAYER=X ccs
```

This will output files of the same format called `layer-X.cc`,
`layer-X.cc-info.json`, and `layer-X.cc-decmoposition-info.json`
in the layers subdirectory.

### Connected Components vs Layers Matrix

This requires that you already ran the connected components command on the 
original graph. To compute the matrix run:

```bash
make GRAPH=dataset_name cc-layers
```

This will output one files for each peel layers bucket file with the the
extension of cc-layers and one file for each layer with connected component 
metadata like in the previous section. The first type of file contains a list 
of the format:
`vertex_id, connected_component, layer, connected_component_in_layer`
Also this will output a file called `layer-X-Y.cc-layers-info.json` containing
metadata for this computation.

### Biconnected Components

To run biconnected components on the entire graph run:

```bash
make GRAPH=dataset_name bccs
```

This will output a file called `dataset_name.bcc` with a list formated as
`source,target,biconnected_component_id`. This will also output a file called
`dataset_name.bcc-info.json` containing metadata for this computation.

To run biconnected components on a layer run:

```bash
make GRAPH=dataset_name LAYER=X bccs
```

This will output files of the same format called `layer-X.bcc` and
`layer-X.bcc-info.json` in the layers subdirectory.

To run biconnected components on waves run:

```bash
make GRAPH=dataset_name LAYER=X WAVE=Y bccs
```

This will output files of the same format called `layer-X-wave-Y.bcc` and
`layer-X-wave-Y.bcc-info.json` in the waves subdirectory.

## License

MIT License. See [`LICENSE.md`](LICENSE.md).


## Contact

For questions or support [open an issue][issues] or contact [Daniel Nakhimovich][dan].

[edge-decomp]: https://link.springer.com/article/10.1007/s13278-014-0191-7
[atlas]: https://github.com/DanManN/atlas
[dan]: mailto:dnahimov@gmail.com
[issues]: https://github.com/DanManN/atlas-algorithm/issues
