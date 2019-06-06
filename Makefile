SHELL := $(shell which bash)
PYTHON := $(shell which python3)
GRAPH := simplegraph
LAYER := 0
WAVE := 0
SP := 2**16

PRODUCT := preproc buffkcore ewave cc-layers-mat

CXX := g++
LINKER := g++
CXXFLAGS := -Wall -Wextra -fopenmp -O3 -pthread -std=c++11 #-lboost_system

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
	./preproc $(GRAPH)/$(GRAPH).txt $$NUMEDGES

.PHONY: sanitize

union:
	NUMEDGES=$$(head $(GRAPH)/$(GRAPH).txt | tr ' ' '\n' | grep -a1 'Edges' | tail -n1); \
	[ ! -z "$${NUMEDGES##*[!0-9]*}" ] || NUMEDGES=$$(($$(wc -l < $(GRAPH)/$(GRAPH).txt))); \
	./preproc $(GRAPH)/$(GRAPH).txt $$NUMEDGES true

.PHONY: union

decomp:
	mkdir -p $(GRAPH)/$(GRAPH)_layers
	./buffkcore \
		"$(GRAPH)/$(GRAPH).bin" \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).bin)/8)) \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).cc)/8)) \
		"$(GRAPH)/$(GRAPH).cc" \
		$$(($$(tail -c8 $(GRAPH)/$(GRAPH).cc | ./bindump.sh -w4 | head -n 1)))

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
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).cc)/8))

.PHONY: dwave

cc-layers:
	for FILE in $$(ls $(GRAPH)/$(GRAPH)_layers -v | grep .csv); do \
		echo $$FILE; \
		./cc-layers-mat $(GRAPH)/$(GRAPH)_layers/"$$FILE" $(GRAPH)/$(GRAPH).cc $(GRAPH)/$(GRAPH)_layers; \
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
		./wavelayercc.py $(GRAPH) $$LAYER; \
	done

.PHONY: wave-layer-cc

subwaveccs:
	for FILE in $$(ls $(GRAPH)/$(GRAPH)_waves -v | grep waves-info.json); do \
		echo $$FILE; \
		LAYER=$${FILE:6:-16}; \
		echo Layer: $$LAYER; \
		./consubwave.py $(GRAPH) $$LAYER; \
	done

.PHONY: subwaveccs

bstats:
	echo $$(($$(wc -c < $(GRAPH)/$(GRAPH).bin)/8)), $$(($$(wc -c < $(GRAPH)/$(GRAPH).cc)/8)), $$(($$(tail -c8 $(GRAPH)/$(GRAPH).cc | ./bindump.sh -w4 | head -n 1)))

.PHONY: bstats

lstats:
	echo \
		$$($(PYTHON) -c "import sys, json; x=json.load(sys.stdin)['$(LAYER)']; print(2*x['edges'],x['vertices'])" < $(GRAPH)/$(GRAPH)-layer-info.json) \
		$$($(PYTHON) -c "import sys, json; print(json.load(sys.stdin)['$(LAYER)']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json)

.PHONY: lstats
