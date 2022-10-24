export function initUI() {
  // // init right button
  $('.right-button-button button').button()
  $('.right-button-detail-container button').button()
  // $('#cumulative-search-checkbox').checkboxradio()

  $('#right-filter-slider').slider({
    range: true
  })

  $('#right-filter-induce-slider').slider({
    range: true
  });
  $('#right-filter-span-slider').slider({
    range: true
  });
  $('#right-filter-jump-slider').slider({
    range: true
  });
  $('#right-filter-back-slider').slider({
    range: true
  });

  $('#right-extend-step-slider').slider({
    range: 'min'
  })

  $('#right-paly-step-slider').slider({
    range: 'min'
  })

  $('#right-play-detail-tab').tabs()


  $('#right-search-button-container').hover(function (e) {
    $('#right-search-button-container .right-button-detail-container').slideToggle("fast")
  });
  $('#right-filter-button-container').hover(function (e) {
    $('#right-filter-button-container .right-button-detail-container').slideToggle("fast")
  });
  $('#right-extract-button-container').hover(function (e) {
    $('#right-extract-button-container .right-button-detail-container').slideToggle("fast")
  });
  $('#right-expand-button-container').hover(function (e) {
    $('#right-expand-button-container .right-button-detail-container').slideToggle("fast")
  });
  $('#right-play-button-container').hover(function (e) {
    $('#right-play-button-container .right-button-detail-container').slideToggle("fast")
  });

  // // init bottom slider
  $('#node-size-slider').slider({
    range: 'min',
    value: 10
  });
  $('#link-size-slider').slider({
    range: 'min',
    value: 70,
  });
  $('#node-opacity-slider').slider({
    range: 'min',
    value: 60,
  });
  $('#link-opacity-slider').slider({
    range: 'min',
    value: 80
  });


  $('#global-horizontal-stretch-slider').slider({
    range: 'min'
  });
  $('#local-horizontal-stretch-slider').slider({
    range: 'min',
    value: 50,
  });
  $('#local-sub-horizontal-stretch-slider').slider({
    range: 'min',
    value: 50
  });

  $('#global-vertical-stretch-slider').slider({
    range: 'min'
  });
  $('#local-vertical-stretch-slider').slider({
    range: 'min',
    value: 50,
  });
  $('#local-sub-vertical-stretch-slider').slider({
    range: 'min',
    value: 50
  });

  $( "#user-info-dialog" ).dialog({
    width: '60%'
  });

  disableExpand();

  GlobalLocal();
}

export function addTitle() {
  $('#grid-map-container')
    .attr('title', 'click a glyph to open its wave-fragment infomation in fork map')
    .tooltip({
      track: true
    })

  $('#right-search-button-main-button')
    .attr('title', 'search nodes by labels. exact(#), logic or(|), logic and(&) are allowed. cumulative search to keep previous result')
    .tooltip({
      track: true
    })

  $('#cumulative-influencers-button')
    .attr('title', 'use high down degree vertices as search result')
    .tooltip({
      track: true
    })

  $('#longest-dag-path-button')
    .attr('title', 'use vertices on longest DAG path as search result')
    .tooltip({
      track: true
    })

  $('#widest-level')
    .attr('title', 'use vertices in largest topo sorted level as search result')
    .tooltip({
      track: true
    })

  $('#right-filter-button-main-button')
    .attr('title', 'filter edges according to wave-fragment indices. select meta to show meta DAG of wave-fragment decomposition')
    .tooltip({
      track: true
    })

  $('#right-filter-induce-detail-slider')
  .attr('title', 'special filter for level-induced (horizontal) edges')
  .tooltip({
    track: true
  })

  $('#right-filter-span-detail-slider')
  .attr('title', 'special filter for spanning (one level up) edges')
  .tooltip({
    track: true
  })

  $('#right-filter-jump-detail-slider')
  .attr('title', 'special filter for jump (more than one level up) edges')
  .tooltip({
    track: true
  })

  $('#right-filter-back-detail-slider')
  .attr('title', 'special filter for back (going down) edges')
  .tooltip({
    track: true
  })
    

  $('#right-extract-button-container')
    .attr('title', 'extract current showing graph to a new window')
    .tooltip({
      track: true
    })

  $('#right-play-button-container')
    .attr('title', 'for each fragment, show its edges going up, followed by all its edges going up and down, and its spanning edges')
    .tooltip({
      track: true
    })


  $('#expand-new-neighbor')
    .attr('title', 'nested spheres encode the accumulated weight from the search results and meta-node internal edges')
    .tooltip({
      track: true
    })

  $('#global-grpah-show-hide-button')
    .attr('title', 'show/hide local fixed points intersection graph on the grid map')
    .tooltip({
      track: true
    })

  $('#global-help-button')
    .attr('title', '"the highlighted meta-node" consists of a collection of connected fixed points whose size and fixed point value distribution is shown in the grid map to the right.')
    .tooltip({
      track: true
    })
}

export function disableExpand() {
  $('#right-expand-button-container').css('display', 'none')
}

export function enableExpand() {
  $('#right-expand-button-container').css('display', 'block')
}


export function hideGlobal() {
  $('#global-graph-container').css('display', 'none');
  $('#bottom-separate-slider-container .global-graph-slider').css('display', 'none');
  // TODO: buttons under minimap
}
export function hideLocalSub() {
  $('#local-subgraph-container').css('display', 'none');
  $('#bottom-separate-slider-container .local-sub-graph-slider').css('display', 'none');
  
  $('local-subgraph-separater').css('display', 'none');
}

export function hideLocal() {
  $('#local-subgraph-container').css('display', 'none');
  $('#bottom-separate-slider-container .local-sub-graph-slider').css('display', 'none');

  // TODO: localInfo
}

export function showGlobal() {
  $('#global-graph-container').css('display', 'block');
  $('#bottom-separate-slider-container .global-graph-slider').css('display', 'block');
  // TODO: buttons under minimap
}
export function showLocalSub() {
  $('#local-subgraph-container').css('display', 'block');
  $('#bottom-separate-slider-container .local-sub-graph-slider').css('display', 'block');

  $('local-subgraph-separater').css('display', 'block');
}

export function GlobalLocal() {
  hideLocalSub();
  showGlobal();
}

export function LocalLocalsub() {
  hideGlobal();
  showLocalSub()
}

export function LocalOnly() {
  hideLocalSub();
  hideGlobal();
}