export function readV2lccFile(data) {
  const v2lccSetDict = {};

  // let idx = 1;
  for (const [vertex, cc, layer, lcc] of d3.csvParseRows(data)) {
    const key = `${lcc}@${layer}`
    if (!v2lccSetDict.hasOwnProperty(vertex)) {
      v2lccSetDict[vertex] = new Set();
    };
    v2lccSetDict[vertex].add(key);
  };
  return v2lccSetDict;
};

export function readIntersectionFile(idx2lccData, edgeData, spanningEdgeData, lcc2nodeDict, separationSymbol) {
  const intersectionIdx2lccDict = {};
  const links = []
  const stLcc2linkDict = {};

  for (const [idx, layer, lcc] of d3.csvParseRows(idx2lccData)) {
    intersectionIdx2lccDict[idx] = `${lcc}${separationSymbol}${layer}`;
  };

  let link;
  for (const [src, tgt, weight] of d3.csvParseRows(edgeData)) {
    const srcKey = intersectionIdx2lccDict[src];
    const tgtKey = intersectionIdx2lccDict[tgt];
    link = {
      source: lcc2nodeDict[srcKey].id,
      target: lcc2nodeDict[tgtKey].id,
      vertices: parseInt(weight),
      vLabelSet: new Set(),
      isSpan: false
    }
    stLcc2linkDict[`${srcKey}:${tgtKey}`] = link;
    links.push(link);
  };
  for (const [src, tgt, weight] of d3.csvParseRows(spanningEdgeData)) {
    const srcKey = intersectionIdx2lccDict[src];
    const tgtKey = intersectionIdx2lccDict[tgt];
    stLcc2linkDict[`${srcKey}:${tgtKey}`].isSpan = true;
  }
  return [links, stLcc2linkDict];
}


export function readBucketFile(data) {
  const lcc2buckLccDict = {};

  const buckLcc2lccSetDict = {};

  const buckNodes = [];
  const buckLcc2buckNodeDict = {};
  const idx2buckNodeDict = {};

  let idx = 1;
  let node;

  for (const [layer, lcc, bucket, vSize, eSize] of d3.csvParseRows(data)) {
    const lccKey = `${lcc}@${layer}`
    const bucketKey = `${bucket},${layer}`
    lcc2buckLccDict[lccKey] = bucketKey;
    if (!buckLcc2buckNodeDict.hasOwnProperty(bucketKey)) {
      node = {
        id: idx++,
        layer: parseInt(layer),
        lcc: 0,
        lccIdx: 0,
        bucket: parseInt(bucket),
        vertices: 0,
        edges: 0,
        vLabelSet: new Set(),
        eDateSet: {},
        eAucHouseSet: {},
        eObjTypeSet: {},
        eGenreSet: {},
        isSpiral: false,
        count: 0,
        isFiltered: true,
        isFpCover: false,
        isAucHouseCover: false,
      };
      idx2buckNodeDict[node.id] = node;
      buckLcc2buckNodeDict[bucketKey] = node;
      buckNodes.push(node);
      buckLcc2lccSetDict[bucketKey] = new Set();
    } else {
      node = buckLcc2buckNodeDict[bucketKey];
    };
    node.vertices += parseInt(vSize);
    node.edges += parseInt(eSize);
    buckLcc2lccSetDict[bucketKey].add(lccKey);
    node.count++;
    if (node.count !== 1) {
      node.isSpiral = true;
    }
  }

  return [lcc2buckLccDict, buckNodes, buckLcc2buckNodeDict, idx2buckNodeDict, buckLcc2lccSetDict];
}

export function readVertexLabelFile(data, v2lccSetDict, lcc2buckLccDict, buckLcc2buckNodeDict, stBuckLcc2buckLinkDict) {
  const v2labelDict = {}
  for (const [vertex, label] of d3.csvParseRows(data)) {
    v2labelDict[vertex] = label;
    if (v2lccSetDict.hasOwnProperty(vertex)) {
      const lccSet = v2lccSetDict[vertex];
      const lccList = [...lccSet].sort((a, b) => parseInt(a.split('@')[1]) - parseInt(b.split('@')[1]));
      // console.log(lccList)

      for (const lccKey of lccList) {
        buckLcc2buckNodeDict[lcc2buckLccDict[lccKey]].vLabelSet.add(label);
      };

      const lccPairList = lccList.flatMap((v, i) => lccList.slice(i + 1).map(w => [v, w]));
      // console.log(stBuckLcc2buckLinkDict);
      // console.log(lcc2buckLccDict);
      for (const [srcKey, tgtKey] of lccPairList) {
        stBuckLcc2buckLinkDict[`${lcc2buckLccDict[srcKey]}:${lcc2buckLccDict[tgtKey]}`].vLabelSet.add(label);
      };
    };
  };
  return v2labelDict;
}

export function getNodeLabel(d) {
  // let label = '&nbsp;&nbsp;' + `V${d['vertices']}, E${d['edges']}` + '<br>';
  let label = '';
  // console.log(d)
  // label += '&nbsp;&nbsp;' + 'Names:<br>' + [...d['vLabelSet']].sort().filter(d => d.length !== 0).join('<br>') + '<br>';
  // label += '&nbsp;&nbsp;' + 'Dates:<br>' + [...d['eDateSet']].sort().filter(d => d.length !== 0).join('<br>') + '<br>';
  // label += '&nbsp;&nbsp;' + 'Auction Houses:<br>' + [...d['eAucHouseSet']].sort().filter(d => d.length !== 0).join('<br>') + '<br>';
  // label += '&nbsp;&nbsp;' + 'Object Types:<br>' + [...d['eObjTypeSet']].sort().filter(d => d.length !== 0).join('<br>') + '<br>';
  // label += '&nbsp;&nbsp;' + 'Genres:<br>' + [...d['eGenreSet']].sort().filter(d => d.length !== 0).join('<br>');
  return label;
}

export function getLinkLabel(d) {
  // let label = '&nbsp;&nbsp;' + `V${d['vertices']}, E${d['edges']}` + '<br>';
  let label = '';
  // console.log(d)
  label += '&nbsp;&nbsp;' + 'Names:<br>' + [...d['vLabelSet']].sort().join('<br>') + '<br>';
  // label += '&nbsp;&nbsp;' + 'Dates:<br>' + [...d['eDateSet']].sort().join('<br>') + '<br>';
  // label += '&nbsp;&nbsp;' + 'Auction Houses:<br>' + [...d['eAucHouseSet']].sort().join('<br>') + '<br>';
  // label += '&nbsp;&nbsp;' + 'Object Types:<br>' + [...d['eObjTypeSet']].sort().join('<br>') + '<br>';
  // label += '&nbsp;&nbsp;' + 'Genres:<br>' + [...d['eGenreSet']].sort().join('<br>');
  return label;
}