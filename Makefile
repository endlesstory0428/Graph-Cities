SHELL := $(shell which bash)
PYTHON := $(shell which python3)
DIR := $(shell pwd)
GRAPH := simplegraph
LAYER := 0
WAVE := 0
SP := 2**16
LOGSIZE := 100000000

PRODUCT := preproc buffkcore ewave cc-layers-mat

CXX := g++
LINKER := g++
CXXFLAGS := -Wall -Wextra -fopenmp -O3 -pthread -std=c++11 -I/$(DIR)/boost_1_69_0 -L/$(DIR)/boost_1_69_0/stage/lib

SRCDIR := ./src
SRCFILES := $(wildcard $(SRCDIR)/*.cpp)
OBJFILES := $(patsubst %.cpp,%.o,$(SRCFILES))

all: $(PRODUCT)

%: $(SRCDIR)/%.o
	$(LINKER) $(CXXFLAGS) $^ -o $@

%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCDIRS) -c $< -o $@

clean:
	rm -f $(PRODUCT) $(OBJFILES)

.PHONY: clean

sanitize:
	NUMEDGES=$$(head $(GRAPH)/$(GRAPH).txt | tr ' ' '\n' | grep -a1 'Edges' | tail -n1); \
	[ ! -z "$${NUMEDGES##*[!0-9]*}" ] || NUMEDGES=$$(($$(wc -l < $(GRAPH)/$(GRAPH).txt))); \
	./preproc $(GRAPH)/$(GRAPH).txt $$NUMEDGES false $$((NUMEDGES + 1)) $(LOGSIZE)

.PHONY: sanitize

union:
	NUMEDGES=$$(head $(GRAPH)/$(GRAPH).txt | tr ' ' '\n' | grep -a1 'Edges' | tail -n1); \
	[ ! -z "$${NUMEDGES##*[!0-9]*}" ] || NUMEDGES=$$(($$(wc -l < $(GRAPH)/$(GRAPH).txt))); \
	./preproc $(GRAPH)/$(GRAPH).txt $$NUMEDGES true $$((NUMEDGES * 2)) $(LOGSIZE)

.PHONY: union

decomp:
	mkdir -p $(GRAPH)/$(GRAPH)_layers
	./buffkcore \
		"$(GRAPH)/$(GRAPH).bin" \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).bin)/8)) \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).cc)/8)) \
		"$(GRAPH)/$(GRAPH).cc" \
		$$(($$(tail -c8 $(GRAPH)/$(GRAPH).cc | ./bindump.sh -w4 | head -n 1))) \
		$(LOGSIZE)

.PHONY: decomp

dwave:
	mkdir -p $(GRAPH)/$(GRAPH)_waves
	FILENAME=$$(echo $(GRAPH)/$(GRAPH)_layers/*-$$($(PYTHON) -c "import sys, json; print(json.load(sys.stdin)['$(LAYER)']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json).csv); \
	./ewave \
		$(GRAPH)/$(GRAPH)_layers \
		"$$FILENAME" \
		$(LAYER) \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin)['$(LAYER)']; print(2*x['edges'],x['vertices'])" < $(GRAPH)/$(GRAPH)-layer-info.json) \
		$(GRAPH)/$(GRAPH).cc \
		$$(($$(tail -c8 $(GRAPH)/$(GRAPH).cc | ./bindump.sh -w4 | head -n 1))) \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).cc)/8)) \
		$(LOGSIZE)

.PHONY: dwave

cc-layers:
	for FILE in $$(ls $(GRAPH)/$(GRAPH)_layers -v | grep .csv); do \
		echo $$FILE; \
		./cc-layers-mat $(GRAPH)/$(GRAPH)_layers/"$$FILE" $(GRAPH)/$(GRAPH).cc $(GRAPH)/$(GRAPH)_layers $(LOGSIZE); \
	done

.PHONY: cc-layers

waves:
	mkdir -p $(GRAPH)/$(GRAPH)_waves
	for FILE in $$(ls $(GRAPH)/$(GRAPH)_layers -v | grep .cc-info.json); do \
		echo $$FILE; \
		LAYER=$${FILE:6:-13}; \
		NUM=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(x[sorted(x,key=lambda k:x[k].get('edges',0))[-1]]['edges'])" < $(GRAPH)/$(GRAPH)_layers/"$$FILE"); \
		if (($$NUM > $(SP))); then \
			echo Layer: $$LAYER; \
			FILENAME=$$(echo $(GRAPH)/$(GRAPH)_layers/*-$$($(PYTHON) -c "import sys, json; print(json.load(sys.stdin)['$$LAYER']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json).csv); \
			./ewave \
				$(GRAPH)/$(GRAPH)_layers \
				"$$FILENAME" \
				$$LAYER \
				$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin)['$$LAYER']; print(2*x['edges'],x['vertices'])" < $(GRAPH)/$(GRAPH)-layer-info.json) \
				$(GRAPH)/$(GRAPH).cc \
				$$(($$(tail -c8 $(GRAPH)/$(GRAPH).cc | ./bindump.sh -w4 | head -n 1))) \
				$$(($$(wc -c < $(GRAPH)/$(GRAPH).cc)/8)); \
		fi; \
	done

.PHONY: waves

wave-layer-cc:
	for FILE in $$(ls $(GRAPH)/$(GRAPH)_waves -v | grep waves-info.json); do \
		echo $$FILE; \
		LAYER=$${FILE:6:-16}; \
		echo Layer: $$LAYER; \
		scripts/wavelayercc.py $(GRAPH) $$LAYER; \
	done

.PHONY: wave-layer-cc

metawccs:
	for FILE in $$(ls $(GRAPH)/$(GRAPH)_waves -v | grep waves.csv); do \
		echo $$FILE; \
		LAYER=$${FILE:6:-10}; \
		echo Layer: $$LAYER; \
		./consubwave.py $(GRAPH) $$LAYER; \
	done

.PHONY: metawccs

# if (($$(stat -c '%s' $(GRAPH)/$(GRAPH)_waves/$$FILE)/1024/1024/1024 < 6)); then \
#     ./consubwave.py $(GRAPH) $$LAYER; \
# fi; \

bstats:
	echo $$(($$(wc -c < $(GRAPH)/$(GRAPH).bin)/8)), $$(($$(wc -c < $(GRAPH)/$(GRAPH).cc)/8)), $$(($$(tail -c8 $(GRAPH)/$(GRAPH).cc | ./bindump.sh -w4 | head -n 1)))

.PHONY: bstats

lstats:
	echo \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin)['$(LAYER)']; print(2*x['edges'],x['vertices'])" < $(GRAPH)/$(GRAPH)-layer-info.json) \
		$$($(PYTHON) -c "import sys, json; print(json.load(sys.stdin)['$(LAYER)']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json)

.PHONY: lstats



dwave-all:
	FPLIST=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join([l for l in x.keys() if int(l) > 0]))" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	for FP in $$FPLIST; \
	do \
		echo $$FP; \
		make GRAPH=$(GRAPH) LAYER=$$FP LOGSIZE=$(LOGSIZE) dwave; \
	done;
.PHONY: dwave-all

fp-info:
	FPLIST=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join([l for l in x.keys() if int(l) > 0]))" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	for FP in $$FPLIST; \
	do \
		$(PYTHON) scripts/freqUsed/wavelayercc.py $(GRAPH) $$FP; \
	done; \
	$(PYTHON) scripts/freqUsed/numfixedpoints.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/convert.py -data $(GRAPH);
.PHONY: fp-info

bucket:
	$(PYTHON) scripts/freqUsed/bucketingWithFP.py -data $(GRAPH) -IP 262144;
.PHONY: bucket

wavemap:
	$(PYTHON) scripts/freqUsed/wavemaps.py $(GRAPH) ; \
	$(PYTHON) scripts/freqUsed/wavemapsFragments.py $(GRAPH) ; \
	$(PYTHON) scripts/freqUsed/wavemapsFullGraph2.py $(GRAPH) ; 
.PHONY: wavemap

sculpture:
	$(PYTHON) scripts/freqUsed/profile.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/entropy.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/bucket_loop.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/fp_dist.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/addMean.py $(GRAPH); 
.PHONY: sculpture

intersection:
	$(PYTHON) scripts/freqUsed/fpmetagraph.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/fpmetagraphnormalize.py $(GRAPH); 
.PHONY: intersection

gridmap:
	$(PYTHON) scripts/freqUsed/getMap6-2.py $(DIR)/ $(GRAPH); \
	$(PYTHON) scripts/freqUsed/getBuildingBucketFromMap.py $(DIR)/ $(GRAPH);
.PHONY: gridmap

geom:
	mkdir $(DIR)/$(GRAPH)/cityMesh; \
	COLOR=$$($(PYTHON) scripts/freqUsed/color.py $(GRAPH)); \
	$(PYTHON) scripts/freqUsed/cityMesh.py $(DIR)/ $(GRAPH) $$COLOR > $(DIR)/cityMesh.sh; \
	chmod +x $(DIR)/cityMesh.sh; \
	$(DIR)/cityMesh.sh;
	truncate -s-3 $(DIR)/$(GRAPH)/cityMesh/bushes.json
	sed -i -e "1 i \{" -e"$$ a\}" $(DIR)/$(GRAPH)/cityMesh/bushes.json
.PHONY: geom

meta-dag:
	mkdir $(DIR)/$(GRAPH)/dag; \
	$(PYTHON) scripts/freqUsed/dagBat.py $(GRAPH) > $(DIR)/dag.sh; \
	chmod +x $(DIR)/dag.sh; \
	./dag.sh
.PHONY:meta-dag

fpViewer:
	NUMEDGES=$$(tail $(GRAPH)/$(GRAPH).txt -n1 | awk -F, '{print $1}'); \
	./preproc $(GRAPH)/$(GRAPH).txt $$NUMEDGES true; \
	make GRAPH=$(GRAPH) decomp; \
	FPLIST=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join([l for l in x.keys() if int(l) > 0]))" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	for FP in $$FPLIST; \
	do \
		echo $$FP; \
		make GRAPH=$(GRAPH) LAYER=$$FP dwave; \
	done; \
	make GRAPH=$(GRAPH) cc-layers; \
	for FP in $$FPLIST; \
	do \
		$(PYTHON) scripts/freqUsed/wavelayercc.py $(GRAPH) $$FP; \
	done; \
	$(PYTHON) scripts/freqUsed/fpmetagraph.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/getMap_noWave.py $(DIR)/ $(GRAPH); \
	$(PYTHON) scripts/freqUsed/getMapDag2-2.py $(DIR)/ $(GRAPH); \
	$(PYTHON) scripts/freqUsed/getSpanningDag.py $(GRAPH)/$(GRAPH)-layerBucketEdge.s-t-w; \
	$(PYTHON) scripts/freqUsed/mergeCCLayers.py $(DIR)/ $(GRAPH);
.PHONY: fpViewer
