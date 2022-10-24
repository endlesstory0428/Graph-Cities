SHELL := $(shell which bash)
PYTHON := $(shell which python3)
DIR := $(shell pwd)
GRAPH := simplegraph
LOCALMININODE := 0
MININODE := 0
FLOORLIST := []
BLDGFILE := simplegraph
METAFILE := simplegraph
LOCALFILE := simplegraph
BLDGDESC := BLDG
METADESC := wcc
LOCALDESC := frag cc
SINGLEBUILDING := false




retrive:
	ln -s wave-decomposition/$(GRAPH)/$(GRAPH)-idx2LayerBucket.i-l-b.csv ./$(GRAPH)-idx2LayerBucket.i-l-b.csv; \
	ln -s wave-decomposition/$(GRAPH)/$(GRAPH)-layerBucketEdge.s-t-w.csv ./$(GRAPH)-layerBucketEdge.s-t-w.csv; \
	ln -s wave-decomposition/$(GRAPH)/$(GRAPH)-layerBucketEdge.s-t-w.span.csv ./$(GRAPH)-layerBucketEdge.s-t-w.span.csv; \
	ln -s wave-decomposition/$(GRAPH)/$(GRAPH)-lccBuck.l-lcc-b-v-e.csv ./$(GRAPH)-lccBuck.l-lcc-b-v-e.csv; \
	ln -s wave-decomposition/$(GRAPH)/$(GRAPH)_waves ./$(GRAPH)_waves; \
	ln -s wave-decomposition/$(GRAPH)/$(GRAPH).cc-layers ./$(GRAPH).cc-layers; \
	ln -s wave-decomposition/$(GRAPH)/$(GRAPH)_names.csv ./$(GRAPH)_names.csv; \
	ln -s wave-decomposition/$(GRAPH)/$(GRAPH)_info.txt ./$(GRAPH)_info.txt; \
	cp index3.html index3_$(GRAPH).html; \
	cp index_copy7.js index_copy7_$(GRAPH).js; \
	sed -i '30c   <script type="module" src="index_copy7_$(GRAPH).js"></script>' index3_$(GRAPH).html; \
	sed -i '33c const datasetName = "$(GRAPH)"' index_copy7_$(GRAPH).js; \
	sed -i '34c const ccName = ""' index_copy7_$(GRAPH).js; \
	sed -i '35c const localMiniMapHighLightID = $(LOCALMININODE);' index_copy7_$(GRAPH).js; \
	sed -i '36c const miniMapHighLightID = $(MININODE);' index_copy7_$(GRAPH).js; \
	sed -i '37c const buildingHighLightIDSet = new Set($(FLOORLIST))' index_copy7_$(GRAPH).js; \
	sed -i '38c const buildingName = "$(BLDGFILE)"' index_copy7_$(GRAPH).js; \
	sed -i '39c const metaDagName = "$(METAFILE)"' index_copy7_$(GRAPH).js; \
	sed -i '40c const localMetaDagName = "$(LOCALFILE)"' index_copy7_$(GRAPH).js; \
	sed -i '41c const buildingDesc = "$(BLDGDESC)"' index_copy7_$(GRAPH).js; \
	sed -i '42c const metaDagDesc = "$(METADESC)"' index_copy7_$(GRAPH).js; \
	sed -i '43c const localMetaDagDesc = "$(LOCALDESC)"' index_copy7_$(GRAPH).js; \
	sed -i '44c const singleMiniBuildingFlag = $(SINGLEBUILDING)' index_copy7_$(GRAPH).js; 
