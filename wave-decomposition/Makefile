SHELL := $(shell which bash)
PYTHON := $(shell which python3)
DIR := $(shell pwd)
GRAPH := simplegraph
PARENT := simplegraph
LAYER := 0
LCC := 0
BUCKET := 0
WAVE := 0
SP := 2**16
LOGSIZE := 100000000
DAGNAME := simplegraph
DAGTH := 8192

PRODUCT := preproc buffkcore ewave cc-layers-mat

CXX := g++
LINKER := g++ -static
CXXFLAGS := -Wall -Wextra -fopenmp -O3 -pthread -std=c++11 -Isrc/dagMeta/include

SRCDIR := ./src
SRCFILES := $(wildcard $(SRCDIR)/*.cpp)
OBJFILES := $(patsubst %.cpp,%.o,$(SRCFILES))

all: 
	make src-cc-layers-uf; \
	make src-dagMeta; \
	make src-decomp; \
	make src-dwave; \
	make src-entropy; \
	make src-gridmap; \
	make src-intersection; \
	make src-lccBuck; \
	make src-preproc; \
	make src-wave-layer-cc; \
	make src-wavemap

src-cc-layers-uf: cc-layers-mat

%: $(SRCDIR)/cc-layers-uf/%.o
	$(LINKER) $(CXXFLAGS) $^ -o $@
	
%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCDIRS) -c $< -o $@

src-dagMeta: DAGMetaNode_touch edgeCutCompress_touch topSrc_touch waveCC_touch waveFragLevel_touch waveFragLevel_touch_bucket

%: $(SRCDIR)/dagMeta/%.o
	$(LINKER) $(CXXFLAGS) $^ -o $@
	
%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCDIRS) -c $< -o $@

src-decomp: buffkcore

%: $(SRCDIR)/decomp/%.o
	$(LINKER) $(CXXFLAGS) $^ -o $@
	
%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCDIRS) -c $< -o $@

src-dwave: ewave_next

%: $(SRCDIR)/dwave/%.o
	$(LINKER) $(CXXFLAGS) $^ -o $@
	
%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCDIRS) -c $< -o $@

src-entropy: entropy

%: $(SRCDIR)/entropy/%.o
	$(LINKER) $(CXXFLAGS) $^ -o $@
	
%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCDIRS) -c $< -o $@

src-gridmap: gridmap

%: $(SRCDIR)/gridmap/%.o
	$(LINKER) $(CXXFLAGS) $^ -o $@
	
%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCDIRS) -c $< -o $@

src-intersection: fpmetagraph

%: $(SRCDIR)/intersection/%.o
	$(LINKER) $(CXXFLAGS) $^ -o $@
	
%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCDIRS) -c $< -o $@

src-lccBuck: lccBuck

%: $(SRCDIR)/lccBuck/%.o
	$(LINKER) $(CXXFLAGS) $^ -o $@
	
%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCDIRS) -c $< -o $@

src-preproc: preproc

%: $(SRCDIR)/preproc/%.o
	$(LINKER) $(CXXFLAGS) $^ -o $@

%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCDIRS) -c $< -o $@

src-wave-layer-cc: wavelayercc_direct

%: $(SRCDIR)/wave-layer-cc/%.o
	$(LINKER) $(CXXFLAGS) $^ -o $@
	
%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCDIRS) -c $< -o $@

src-wavemap: wavemaps wavemapsWaveByWave

%: $(SRCDIR)/wavemap/%.o
	$(LINKER) $(CXXFLAGS) $^ -o $@
	
%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCDIRS) -c $< -o $@


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

dwave_next:
	mkdir -p $(GRAPH)/$(GRAPH)_waves
	FILENAME=$$(echo $(GRAPH)/$(GRAPH)_layers/*-$$($(PYTHON) -c "import sys, json; print(json.load(sys.stdin)['$(LAYER)']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json).csv); \
	./ewave_next \
		$(GRAPH)/$(GRAPH)_layers \
		"$$FILENAME" \
		$(LAYER) \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin)['$(LAYER)']; print(2*x['edges'],x['vertices'])" < $(GRAPH)/$(GRAPH)-layer-info.json) \
		$$(($$(tail -c8 $(GRAPH)/$(GRAPH).cc | ./bindump.sh -w4 | head -n 1))) \
		$(LOGSIZE)

.PHONY: dwave_next

cc-layers:
	for FILE in $$(ls $(GRAPH)/$(GRAPH)_layers -v | grep .csv); do \
		echo $$FILE; \
		./cc-layers-mat_ccBuck $(GRAPH)/$(GRAPH)_layers/"$$FILE" $(GRAPH)/$(GRAPH).cc $(GRAPH)/$(GRAPH)_layers $(LOGSIZE); \
	done

.PHONY: cc-layers

cc-layers-uf:
	for FILE in $$(ls $(GRAPH)/$(GRAPH)_layers -v | grep .csv); do \
		echo $$FILE; \
		LAYERSIZE=$$($(PYTHON) scripts/freqUsed/layerSizes.py $(GRAPH)/$(GRAPH)_layers/"$$FILE" $(GRAPH)/$(GRAPH)-layer-info.json); \
		echo $$LAYERSIZE; \
		./cc-layers-mat $(GRAPH)/$(GRAPH)_layers/"$$FILE" $(GRAPH)/$(GRAPH).cc $(GRAPH)/$(GRAPH)_layers $(LOGSIZE) $$LAYERSIZE; \
	done

.PHONY: cc-layers-uf

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

wave-layer-cc_direct:
	FPLIST=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join([l for l in x.keys() if int(l) > 0]))" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	for FP in $$FPLIST; \
	do \
		echo $$FP; \
		FILENAME=$$(echo $(GRAPH)/$(GRAPH)_layers/*-$$($(PYTHON) -c "import sys, json; print(json.load(sys.stdin)['$$FP']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json).cc-layers); \
		./wavelayercc_direct \
			 $$FILENAME \
			 $(GRAPH)/$(GRAPH)_waves/layer-$$FP-waves-info.csv \
			 $(GRAPH)/$(GRAPH)_waves/layer-$$FP-waves-size-info.csv \
			 $$FP \
			 $$(wc -l < $(GRAPH)/$(GRAPH)_waves/layer-$$FP-waves-size-info.csv) \
			 $$(tail -1 $(GRAPH)/$(GRAPH)_waves/layer-$$FP-waves.csv | awk -F, '{print $$1}') \
			 1048576; \
	done

.PHONY: wave-layer-cc_direct

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

dwave-all_next:
	FPLIST=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join([l for l in x.keys() if int(l) > 0]))" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	for FP in $$FPLIST; \
	do \
		echo $$FP; \
		make GRAPH=$(GRAPH) LAYER=$$FP LOGSIZE=$(LOGSIZE) dwave_next; \
	done;
.PHONY: dwave-all_next

fp-info:
	FPLIST=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join([l for l in x.keys() if int(l) > 0]))" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	for FP in $$FPLIST; \
	do \
		$(PYTHON) scripts/freqUsed/wavelayercc.py $(GRAPH) $$FP; \
	done; \
	./scripts/freqUsed/numfixedpoints $(GRAPH); \
	./scripts/freqUsed/convert -data $(GRAPH);
.PHONY: fp-info

fp-info_int:
	FPLIST=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join([l for l in x.keys() if int(l) > 0]))" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	for FP in $$FPLIST; \
	do \
		$(PYTHON) scripts/freqUsed/wavelayercc.py $(GRAPH) $$FP; \
	done; \
	./scripts/freqUsed/numfixedpoints $(GRAPH); \
	./scripts/freqUsed/convert_ve -data $(GRAPH);
.PHONY: fp-info_int

bucket:
	$(PYTHON) scripts/freqUsed/bucketingWithFP.py -data $(GRAPH) -IP 262144;
.PHONY: bucket

bucket_int:
	$(PYTHON) scripts/freqUsed/bucketingWithFP2_ve.py -data $(GRAPH) -IP 262144;
.PHONY: bucket_int

bucket_int_linear:
	$(PYTHON) scripts/freqUsed/bucketingWithFP2Linear_ve.py -data $(GRAPH) -IP 262144;
.PHONY: bucket_int_linear

wavemap:
	$(PYTHON) scripts/freqUsed/wavemaps.py $(GRAPH) ; \
	$(PYTHON) scripts/freqUsed/wavemapsFragments.py $(GRAPH) ; \
	$(PYTHON) scripts/freqUsed/wavemapsFullGraph2.py $(GRAPH) ; 
.PHONY: wavemap

wavemap_int:
	$(PYTHON) scripts/freqUsed/wavemaps_int.py $(GRAPH) ; \
	$(PYTHON) scripts/freqUsed/wavemapsFragments.py $(GRAPH) ; \
	# $(PYTHON) scripts/freqUsed/wavemapsFullGraph2.py $(GRAPH) ; 
.PHONY: wavemap_int

wavemap_cpp:
	./scripts/freqUsed/wavemapsNames $(GRAPH) ; \
	./wavemaps \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/$(GRAPH)_waves/ \
		$$(($$(tail -c8 $(GRAPH)/$(GRAPH).cc | ./bindump.sh -w4 | head -n 1))) \
		$$(wc -l $(GRAPH)/wavemapList.l-lcc-buck.csv | awk '{print $$1}') \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(len(x)-1)" < $(GRAPH)/$(GRAPH)-layer-info.json)
.PHONY: wavemap_cpp


wavemapFullGraph_cpp:
	./scripts/freqUsed/getBuildingList $(GRAPH) ; \
	./wavemapsFileByFile \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/$(GRAPH)_layers/ \
		$(GRAPH)/$(GRAPH)_waves/ \
		$(GRAPH)/$(GRAPH)_layer,lcc.txt \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).cc)/8)) \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).bin)/8)) \
		$$(ls $(GRAPH)/$(GRAPH)_layers -v | grep .cc-layers$$)
.PHONY: wavemapFullGraph_cpp

wavemapFullGraph_wave_cpp:
	for SRCFILE in $$(ls $(GRAPH)/$(GRAPH)_waves -v | grep sources.csv); \
	do \
		echo $$SRCFILE; \
		sort -S 50% -t, -n -k2,2 $(GRAPH)/$(GRAPH)_waves/$$SRCFILE -o $(GRAPH)/$(GRAPH)_waves/$$SRCFILE; \
	done; \
	./scripts/freqUsed/getBuildingList $(GRAPH) ; \
	./wavemapsWaveByWave \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/$(GRAPH)_layers/ \
		$(GRAPH)/$(GRAPH)_waves/ \
		$(GRAPH)/$(GRAPH)_layer,lcc.txt \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).cc)/8)) \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).bin)/8)) \
		$$(ls $(GRAPH)/$(GRAPH)_layers -v | grep .cc-layers$$)
.PHONY: wavemapFullGraph_wave_cpp

wavemapFullGraph_wave_sorted_cpp:
	./scripts/freqUsed/getBuildingList $(GRAPH) ; \
	./wavemapsWaveByWave \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/$(GRAPH)_layers/ \
		$(GRAPH)/$(GRAPH)_waves/ \
		$(GRAPH)/$(GRAPH)_layer,lcc.txt \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).cc)/8)) \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).bin)/8)) \
		$$(ls $(GRAPH)/$(GRAPH)_layers -v | grep .cc-layers$$)
.PHONY: wavemapFullGraph_wave_sorted_cpp

sculpture:
	$(PYTHON) scripts/freqUsed/profile.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/entropy.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/bucket_loop.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/fp_dist.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/addMean.py $(GRAPH); 
.PHONY: sculpture

sculpture_int:
	$(PYTHON) scripts/freqUsed/profile.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/entropy.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/bucket_loop_int.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/fp_dist.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/addMean.py $(GRAPH); 
.PHONY: sculpture_int

fp-entropy:
	FPLIST=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(sorted([l for l in x.keys() if int(l) > 0], key = lambda l: int(l))))" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	FPNUM=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(len(x) - 1)" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	FPFILES=$$(ls $(GRAPH)/$(GRAPH)_layers -v | grep .csv); \
	for FILE in $$FPFILES; do \
		echo $$FILE; \
		sort -S 50% -t, -n -k1,1 -k3,3 $(GRAPH)/$(GRAPH)_layers/$$FILE -o $(GRAPH)/$(GRAPH)_layers/$$FILE; \
	done; \
	./entropy \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/$(GRAPH)_layers/ \
		$$(($$(tail -c8 $(GRAPH)/$(GRAPH).cc | ./bindump.sh -w4 | head -n 1))) \
		$$FPNUM \
		$$FPLIST \
		$$FPFILES
.PHONY: fp-entropy

sculpture_int_cpp:
	make GRAPH=$(GRAPH) fp-entropy; \
	$(PYTHON) scripts/freqUsed/bucket_loop_int.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/fp_dist.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/addMean.py $(GRAPH); 
.PHONY: sculpture_int_cpp

intersection_py:
	$(PYTHON) scripts/freqUsed/fpmetagraph.py $(GRAPH); \
	$(PYTHON) scripts/freqUsed/fpmetagraphnormalize.py $(GRAPH); 
.PHONY: intersection_py

intersection_py_int:
	$(PYTHON) scripts/freqUsed/fpmetagraph.py $(GRAPH); \
	./scripts/freqUsed/fpmetagraphnormalize_int $(GRAPH); 
.PHONY: intersection_py_int

intersection_int_cpp:
	SUM=$$(echo 0); \
	for FILE in $$(ls $(GRAPH)/$(GRAPH)_layers -v | grep .cc-layers$$); do \
		echo $$FILE; \
		LEN=$$(wc -l ${GRAPH}/${GRAPH}_layers/$$FILE | awk '{print $$1}'); \
		SUM=$$( echo $$(($$SUM + $$LEN ))); \
	done; \
	./fpmetagraph \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/$(GRAPH)_layers/ \
		$$SUM \
		$$(ls $(GRAPH)/$(GRAPH)_layers -v | grep .cc-layers$$); \
	mv $(GRAPH)/fpmeta.csv $(GRAPH)/$(GRAPH)-fpmeta.csv; \
	mv $(GRAPH)/fpmeta.ids $(GRAPH)/$(GRAPH)-fpmeta.ids; \
	./scripts/freqUsed/fpmetagraphnormalize_int $(GRAPH); 
.PHONY: intersection_int_cpp

gridmap_py:
	$(PYTHON) scripts/freqUsed/getMap6-2.py $(DIR)/ $(GRAPH); \
	$(PYTHON) scripts/freqUsed/getBuildingBucketFromMap.py $(DIR)/ $(GRAPH);
.PHONY: gridmap_py

gridmap_py_int:
	$(PYTHON) scripts/freqUsed/getMap6-2.py $(DIR)/ $(GRAPH); \
	./scripts/freqUsed/getBuildingBucketFromMap_int $(DIR)/ $(GRAPH);
.PHONY: gridmap_py_int

gridmap_cpp:
	FPLIST=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(sorted([l for l in x.keys() if int(l) > 0], key = lambda l: int(l))))" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	WAVESIZES=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join([str(x[layer]['num_waves']) for layer in sorted([l for l in x.keys() if int(l) > 0], key = lambda l: int(l))]))" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	LCCNUM=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(sum([x[l]['num_fixedpoints'] for l in x.keys() if int(l) > 0]))" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	FPNUM=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(len(x) - 1)" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	BUCKETLIST=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(map(str, x['thresholds'])))" < $(GRAPH)/$(GRAPH)-info.json); \
	./gridmap \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/$(GRAPH)_layers/ \
		$(GRAPH)/$(GRAPH)_waves/ \
		$$(($$(tail -c8 $(GRAPH)/$(GRAPH).cc | ./bindump.sh -w4 | head -n 1))) \
		$$LCCNUM \
		$$FPNUM \
		$$FPLIST \
		$$WAVESIZES \
		$$BUCKETLIST; \
	./scripts/freqUsed/getBuildingBucketFromMap_int $(DIR)/ $(GRAPH);
.PHONY: gridmap_cpp

lccBuck_cpp:
	mkdir $(DIR)/$(GRAPH)/$(GRAPH)_waves/lccBuck; \
	FPLIST=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(sorted([l for l in x.keys() if int(l) > 0], key = lambda l: int(l))))" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	LCCNUM=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(max([x[l]['num_fixedpoints'] for l in x.keys() if int(l) > 0]))" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	FPNUM=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(len(x) - 1)" < $(GRAPH)/$(GRAPH)-layer-info.json); \
	BUCKETLIST=$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(map(str, x['thresholds'])))" < $(GRAPH)/$(GRAPH)-info.json); \
	./lccBuck \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/$(GRAPH)_layers/ \
		$(GRAPH)/$(GRAPH)_waves/ \
		$$(($$(tail -c8 $(GRAPH)/$(GRAPH).cc | ./bindump.sh -w4 | head -n 1))) \
		$$LCCNUM \
		$$FPNUM \
		$$FPLIST \
		$$BUCKETLIST

.PHONY: lccBuck_cpp

geom:
	mkdir $(DIR)/$(GRAPH)/cityMesh; \
	> $(DIR)/$(GRAPH)/cityMesh/bushes.json; \
	COLOR=$$($(PYTHON) scripts/freqUsed/color.py $(GRAPH)); \
	$(PYTHON) scripts/freqUsed/cityMesh.py $(DIR)/ $(GRAPH) $$COLOR > $(DIR)/cityMesh.sh; \
	chmod +x $(DIR)/cityMesh.sh; \
	$(DIR)/cityMesh.sh;
	truncate -s-2 $(DIR)/$(GRAPH)/cityMesh/bushes.json
	sed -i -e "1 i \{" -e"$$ a\}" $(DIR)/$(GRAPH)/cityMesh/bushes.json
.PHONY: geom

geom-vicinity:
	mkdir $(DIR)/$(GRAPH)/cityMesh; \
	> $(DIR)/$(GRAPH)/cityMesh/bushes.json; \
	COLOR=$$($(PYTHON) scripts/freqUsed/color.py $(PARENT)); \
	$(PYTHON) scripts/freqUsed/cityMesh.py $(DIR)/ $(GRAPH) $$COLOR > $(DIR)/cityMesh.sh; \
	chmod +x $(DIR)/cityMesh.sh; \
	$(DIR)/cityMesh.sh;
	truncate -s-2 $(DIR)/$(GRAPH)/cityMesh/bushes.json
	sed -i -e "1 i \{" -e"$$ a\}" $(DIR)/$(GRAPH)/cityMesh/bushes.json
.PHONY: geom-vicinity

meta-dag:
	mkdir $(DIR)/$(GRAPH)/dag; \
	$(PYTHON) scripts/freqUsed/dagBat.py $(GRAPH) > $(DIR)/dag.sh; \
	chmod +x $(DIR)/dag.sh; \
	./dag.sh
.PHONY:meta-dag

frag-dag:
	./DAGMetaNode \
		$(GRAPH) \
		$(LAYER) \
		$(LCC) \
		$$(tail -1 $(GRAPH)/$(GRAPH)_waves/layer-$(LAYER)-waves.csv | awk -F, '{print $$1}')
.PHONY:frag-dag

frag-dag-touch:
	./DAGMetaNode_touch \
		$(GRAPH) \
		$(LAYER) \
		$(LCC) \
		$$(tail -1 $(GRAPH)/$(GRAPH)_waves/layer-$(LAYER)-waves.csv | awk -F, '{print $$1}')
.PHONY:frag-dag-touch

frag-dag-fp:
	./DAGMetaNodeFP \
		$(GRAPH) \
		$(LAYER) \
		$(LCC) \
		$$(tail -1 $(GRAPH)/$(GRAPH)_waves/layer-$(LAYER)-waves.csv | awk -F, '{print $$1}')
.PHONY:frag-dag-fp

top-src-span:
	./topSrc \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/dag/ \
		$(DAGNAME) \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(map(str, [x['maxNodeLabel'], x['nodeNum'], x['linkNum']])))" < $(GRAPH)/dag/$(DAGNAME)-info.json)
.PHONY:top-src-span

top-src-span-touch:
	./topSrc_touch \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/dag/ \
		$(DAGNAME) \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(map(str, [x['maxNodeLabel'], x['nodeNum'], x['linkNum']])))" < $(GRAPH)/dag/$(DAGNAME)-info.json)
.PHONY:top-src-span-touch

edge-cut-compress:
	./edgeCutCompress \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/dag/ \
		$(DAGNAME) \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(map(str, [x['maxNodeLabel'], x['nodeNum'], x['linkNum']])))" < $(GRAPH)/dag/$(DAGNAME)-info.json) \
		$(DAGTH)
.PHONY:edge-cut-compress

edge-cut-compress-touch:
	./edgeCutCompress_touch \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/dag/ \
		$(DAGNAME) \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(map(str, [x['maxNodeLabel'], x['nodeNum'], x['linkNum']])))" < $(GRAPH)/dag/$(DAGNAME)-info.json) \
		$(DAGTH)
.PHONY:edge-cut-compress-touch

wcc-compress-touch:
	./waveCC_touch \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/dag/ \
		$(DAGNAME) \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(map(str, [x['maxNodeLabel'], x['nodeNum'], x['linkNum']])))" < $(GRAPH)/dag/$(DAGNAME)-info.json);
.PHONY:wcc-compress-touch

wave-frag-compress:
	./waveFragLevel \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/dag/ \
		$(DAGNAME) \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(map(str, [x['maxNodeLabel'], x['nodeNum'], sum(x['wave-frag-size']), len(x['wave-frag-size'])])))" < $(GRAPH)/dag/$(DAGNAME)-info.json) \
		$(DAGTH)
.PHONY:wave-frag-compress

wave-frag-compress-touch:
	./waveFragLevel_touch \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/dag/ \
		$(DAGNAME) \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(map(str, [x['maxNodeLabel'], x['nodeNum'], sum(x['wave-frag-size']), len(x['wave-frag-size'])])))" < $(GRAPH)/dag/$(DAGNAME)-info.json) \
		$(DAGTH)
.PHONY:wave-frag-compress-touch

frag-buck-compress-touch:
	sort -S 50% -t, -n -k4,4 $(GRAPH)/dag/$(DAGNAME).node -o $(GRAPH)/dag/$(DAGNAME).node; \
	./waveFragLevel_touch_bucket \
		$(GRAPH) \
		$(GRAPH)/ \
		$(GRAPH)/dag/ \
		$(DAGNAME) \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(map(str, [x['maxNodeLabel'], x['nodeNum'], sum(x['wave-frag-size']), len(x['wave-frag-size'])])))" < $(GRAPH)/dag/$(DAGNAME)-info.json) \
		$(DAGTH)
.PHONY:wave-frag-compress-touch

frag-dag-all:
	mkdir $(DIR)/$(GRAPH)/dag; \
	./scripts/freqUsed/dagBat_cpp $(GRAPH) frag-dag-all > $(DIR)/dag_$(GRAPH).sh; \
	chmod +x $(DIR)/dag_$(GRAPH).sh; \
	./dag_$(GRAPH).sh
.PHONY:frag-dag-all

frag-dag-touch-all:
	mkdir $(DIR)/$(GRAPH)/dag; \
	./scripts/freqUsed/dagBat_cpp $(GRAPH) frag-dag-touch > $(DIR)/dag_$(GRAPH).sh; \
	chmod +x $(DIR)/dag_$(GRAPH).sh; \
	./dag_$(GRAPH).sh
.PHONY:frag-dag-touch-all

top-src-span-all:
	mkdir $(DIR)/$(GRAPH)/dag; \
	./scripts/freqUsed/dagBat_post_cpp $(GRAPH) top-src-span > $(DIR)/dag_$(GRAPH).sh; \
	chmod +x $(DIR)/dag_$(GRAPH).sh; \
	./dag_$(GRAPH).sh
.PHONY:top-src-span-all

top-src-span-touch-all:
	mkdir $(DIR)/$(GRAPH)/dag; \
	./scripts/freqUsed/dagBat_post_cpp $(GRAPH) top-src-span-touch > $(DIR)/dag_$(GRAPH).sh; \
	chmod +x $(DIR)/dag_$(GRAPH).sh; \
	./dag_$(GRAPH).sh
.PHONY:top-src-span-touch-all

edge-cut-compress-all:
	mkdir $(DIR)/$(GRAPH)/dag; \
	./scripts/freqUsed/dagBat_post_cpp $(GRAPH) edge-cut-compress > $(DIR)/dag_$(GRAPH).sh; \
	chmod +x $(DIR)/dag_$(GRAPH).sh; \
	./dag_$(GRAPH).sh
.PHONY:edge-cut-compress-all

edge-cut-compress-touch-all:
	mkdir $(DIR)/$(GRAPH)/dag; \
	./scripts/freqUsed/dagBat_post_cpp $(GRAPH) edge-cut-compress-touch > $(DIR)/dag_$(GRAPH).sh; \
	chmod +x $(DIR)/dag_$(GRAPH).sh; \
	./dag_$(GRAPH).sh
.PHONY:edge-cut-compress-touch-all

wcc-compress-touch-all:
	mkdir $(DIR)/$(GRAPH)/dag; \
	./scripts/freqUsed/dagBat_post_cpp $(GRAPH) wcc-compress-touch > $(DIR)/dag_$(GRAPH).sh; \
	chmod +x $(DIR)/dag_$(GRAPH).sh; \
	./dag_$(GRAPH).sh
.PHONY:wcc-compress-touch-all

wave-frag-compress-all:
	mkdir $(DIR)/$(GRAPH)/dag; \
	./scripts/freqUsed/dagBat_post_cpp $(GRAPH) wave-frag-compress > $(DIR)/dag_$(GRAPH).sh; \
	chmod +x $(DIR)/dag_$(GRAPH).sh; \
	./dag_$(GRAPH).sh
.PHONY:wave-frag-compress-all

wave-frag-compress-touch-all:
	mkdir $(DIR)/$(GRAPH)/dag; \
	./scripts/freqUsed/dagBat_post_cpp $(GRAPH) wave-frag-compress-touch > $(DIR)/dag_$(GRAPH).sh; \
	chmod +x $(DIR)/dag_$(GRAPH).sh; \
	./dag_$(GRAPH).sh
.PHONY:wave-frag-compress-touch-all

frag-buck-compress-touch-all:
	mkdir $(DIR)/$(GRAPH)/dag; \
	./scripts/freqUsed/dagBat_post_cpp $(GRAPH) frag-buck-compress-touch > $(DIR)/dag_$(GRAPH).sh; \
	chmod +x $(DIR)/dag_$(GRAPH).sh; \
	./dag_$(GRAPH).sh
.PHONY:frag-buck-compress-touch-all

dag-size:
	for DAG in $$(ls $(GRAPH)/dag | grep "dagmeta_[0-9]*_[0-9]*.span.link$$"); \
	do \
		wc -l $(GRAPH)/dag/$$DAG; \
	done > $(GRAPH)/dag/dagSize;
	for DAG in $$(ls $(GRAPH)/dag | grep "dagmeta_[0-9]*_[0-9]*.edgeCut.link$$"); \
	do \
		wc -l $(GRAPH)/dag/$$DAG; \
	done > $(GRAPH)/dag/edgeCutSize;
.PHONY:dag-size

fpViewer_old:
	NUMEDGES=$$(tail $(GRAPH)/$(GRAPH).txt -n1 | awk -F, '{print $$1}'); \
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
	./scripts/freqUsed/getMap_noWave $(DIR)/ $(GRAPH); \
	./scripts/freqUsed/getMapDag2-2 $(DIR)/ $(GRAPH); \
	$(PYTHON) scripts/freqUsed/getSpanningDag.py $(GRAPH)/$(GRAPH)-layerBucketEdge.s-t-w; \
	./scripts/freqUsed/mergeCCLayers $(DIR)/ $(GRAPH);
.PHONY: fpViewer_old

fpViewer:
	NUMEDGES=$$(($$(wc -c < $(PARENT)/$(PARENT).bin)/8)); \
	MAXLABEL=$$(sort -nrk1,1 $(GRAPH)/$(GRAPH).txt | head -1 | awk '{print $$1}'); \
	./preproc $(GRAPH)/$(GRAPH).txt $$NUMEDGES false $$MAXLABEL; \
	make GRAPH=$(GRAPH) decomp; \
	make GRAPH=$(GRAPH) dwave-all_next; \
	make GRAPH=$(GRAPH) cc-layers-uf; \
	make GRAPH=$(GRAPH) wave-layer-cc_direct; \
	$(PYTHON) scripts/freqUsed/fpmetagraph.py $(GRAPH); \
	./scripts/freqUsed/getMap_noWave $(DIR)/ $(GRAPH); \
	./scripts/freqUsed/getMapDag2-2 $(DIR)/ $(GRAPH); \
	$(PYTHON) scripts/freqUsed/getSpanningDag.py $(GRAPH)/$(GRAPH)-layerBucketEdge.s-t-w; \
	./scripts/freqUsed/mergeCCLayers $(DIR)/ $(GRAPH);
.PHONY: fpViewer

buck2vicinity:
	./scripts/test/bucket2city $(GRAPH) $(LAYER) $(BUCKET) false;
.PHONY: buck2vicinity

buck2vicinity-smp:
	./scripts/test/bucket2city $(GRAPH) $(LAYER) $(BUCKET) true;
.PHONY: buck2vicinity-smp

buck2strata:
	./scripts/test/bucket2strata $(GRAPH) $(LAYER) $(BUCKET) false;
.PHONY: buck2strata

buck2strata-smp:
	./scripts/test/bucket2strata $(GRAPH) $(LAYER) $(BUCKET) true;
.PHONY: buck2strata-smp

prepareVicinity:
	./preproc \
		$(GRAPH)/$(GRAPH).txt \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin); print(' '.join(map(str, [x['maxlabel']+1, 'false', x['maxlabel']])))" < $(GRAPH)/$(GRAPH)-vicinity-info.json); \
	make GRAPH=$(GRAPH) decomp; \
	make GRAPH=$(GRAPH) dwave-all_next; \
	make GRAPH=$(GRAPH) cc-layers-uf; \
	make GRAPH=$(GRAPH) wave-layer-cc_direct; \
	make GRAPH=$(GRAPH) fp-info_int; \
	./scripts/test/lcc-json2csv $(GRAPH); \
	make GRAPH=$(GRAPH) bucket_int_linear; \
	make GRAPH=$(GRAPH) wavemap_cpp; \
	make GRAPH=$(GRAPH) sculpture_int_cpp; \
	make GRAPH=$(GRAPH) intersection_int_cpp; \
	make GRAPH=$(GRAPH) gridmap_cpp; \
	make GRAPH=$(GRAPH) PARENT=$(PARENT) geom-vicinity; \
	./scripts/freqUsed/getCityInfo $(GRAPH); \
	$(PYTHON) scripts/test/getBestPlot.py $(GRAPH); \
	make GRAPH=$(GRAPH) frag-dag-touch-all; \
	make GRAPH=$(GRAPH) top-src-span-touch-all; \
	make GRAPH=$(GRAPH) wcc-compress-touch-all; \
	make GRAPH=$(GRAPH) wave-frag-compress-touch-all; \
	make GRAPH=$(GRAPH) edge-cut-compress-touch-all; \
	make GRAPH=$(GRAPH) frag-buck-compress-touch-all; \
	make GRAPH=$(GRAPH) dag-size; \
	make GRAPH=$(GRAPH) lccBuck_cpp; \
	./scripts/test/addDagInfo $(GRAPH); \
	./scripts/test/checkLargeNode $(GRAPH); \
	./scripts/test/addBuckESize $(GRAPH); \
	mkdir $(GRAPH)/$(GRAPH)_waves/lccBuck/smp/
	./scripts/test/bucket2sample $(GRAPH) 16384;
.PHONY: prepareVicinity

prepareCity:
	NUMEDGES=$$(($$(wc -c < $(PARENT)/$(PARENT).bin)/8)); \
	MAXLABEL=$$(sort -nrk1,1 $(GRAPH)/$(GRAPH).txt | head -1 | awk '{print $$1}'); \
	./preproc $(GRAPH)/$(GRAPH).txt $$NUMEDGES false $$MAXLABEL; \
	make GRAPH=$(GRAPH) decomp; \
	make GRAPH=$(GRAPH) dwave-all_next; \
	make GRAPH=$(GRAPH) cc-layers-uf; \
	make GRAPH=$(GRAPH) wave-layer-cc_direct; \
	make GRAPH=$(GRAPH) fp-info_int; \
	./scripts/test/lcc-json2csv $(GRAPH); \
	make GRAPH=$(GRAPH) bucket_int; \
	make GRAPH=$(GRAPH) wavemap_cpp; \
	make GRAPH=$(GRAPH) sculpture_int_cpp; \
	make GRAPH=$(GRAPH) intersection_int_cpp; \
	make GRAPH=$(GRAPH) gridmap_cpp; \
	make GRAPH=$(GRAPH) geom; \
	./scripts/freqUsed/getCityInfo $(GRAPH); \
	$(PYTHON) scripts/test/getBestPlot.py $(GRAPH); \
	$(PYTHON) scripts/test/getLccDist.py $(GRAPH); \
	make GRAPH=$(GRAPH) frag-dag-touch-all; \
	make GRAPH=$(GRAPH) top-src-span-touch-all; \
	make GRAPH=$(GRAPH) wcc-compress-touch-all; \
	make GRAPH=$(GRAPH) wave-frag-compress-touch-all; \
	make GRAPH=$(GRAPH) edge-cut-compress-touch-all; \
	make GRAPH=$(GRAPH) frag-buck-compress-touch-all; \
	make GRAPH=$(GRAPH) dag-size; \
	make GRAPH=$(GRAPH) lccBuck_cpp; \
	./scripts/test/addDagInfo $(GRAPH); \
	./scripts/test/checkLargeNode $(GRAPH); \
	./scripts/test/addBuckESize $(GRAPH); \
	mkdir $(GRAPH)/$(GRAPH)_waves/lccBuck/smp/
	./scripts/test/bucket2sample $(GRAPH) 16384;
.PHONY: prepareCity

prepare:
	make GRAPH=$(GRAPH) union; \
	make GRAPH=$(GRAPH) decomp; \
	make GRAPH=$(GRAPH) dwave-all_next; \
	make GRAPH=$(GRAPH) cc-layers-uf; \
	make GRAPH=$(GRAPH) wave-layer-cc_direct; \
	make GRAPH=$(GRAPH) fp-info_int; \
	./scripts/test/lcc-json2csv $(GRAPH); \
	make GRAPH=$(GRAPH) bucket_int; \
	make GRAPH=$(GRAPH) wavemap_cpp; \
	make GRAPH=$(GRAPH) sculpture_int_cpp; \
	make GRAPH=$(GRAPH) intersection_int_cpp; \
	make GRAPH=$(GRAPH) gridmap_cpp; \
	make GRAPH=$(GRAPH) geom; \
	./scripts/freqUsed/getCityInfo $(GRAPH); \
	$(PYTHON) scripts/test/getBestPlot.py $(GRAPH); \
	$(PYTHON) scripts/test/getLccDist.py $(GRAPH); \
	make GRAPH=$(GRAPH) frag-dag-touch-all; \
	make GRAPH=$(GRAPH) top-src-span-touch-all; \
	make GRAPH=$(GRAPH) wcc-compress-touch-all; \
	make GRAPH=$(GRAPH) wave-frag-compress-touch-all; \
	make GRAPH=$(GRAPH) edge-cut-compress-touch-all; \
	make GRAPH=$(GRAPH) frag-buck-compress-touch-all; \
	make GRAPH=$(GRAPH) dag-size; \
	make GRAPH=$(GRAPH) lccBuck_cpp; \
	./scripts/test/addDagInfo $(GRAPH); \
	./scripts/test/checkLargeNode $(GRAPH); \
	./scripts/test/addBuckESize $(GRAPH); \
	mkdir $(GRAPH)/$(GRAPH)_waves/lccBuck/smp/
	./scripts/test/bucket2sample $(GRAPH) 16384;
.PHONY: prepare

prepareDAG:
	make GRAPH=$(GRAPH) frag-dag-touch-all; \
	make GRAPH=$(GRAPH) top-src-span-touch-all; \
	make GRAPH=$(GRAPH) wcc-compress-touch-all; \
	make GRAPH=$(GRAPH) wave-frag-compress-touch-all; \
	make GRAPH=$(GRAPH) edge-cut-compress-touch-all; \
	make GRAPH=$(GRAPH) frag-buck-compress-touch-all; \
	make GRAPH=$(GRAPH) dag-size; \
	./scripts/test/addDagInfo $(GRAPH); \
	./scripts/test/checkLargeNode $(GRAPH); \
	./scripts/test/addBuckESize $(GRAPH);
.PHONY: prepareDAG

updateGeom:
	make GRAPH=$(GRAPH) geom; \
	./scripts/test/addDagInfo $(GRAPH); \
	./scripts/test/checkLargeNode $(GRAPH); \
	./scripts/test/addBuckESize $(GRAPH);
.PHONY: updateGeom