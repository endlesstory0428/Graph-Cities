GRAPH := simplegraph
LAYER := 0
WAVE := 0

PRODUCT := sort buffkcore wave connectedcomponents biconnectedcomponents cc-layers-mat

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
	./sort $(GRAPH)/$(GRAPH).txt $$NUMEDGES

.PHONY: sanitize

union:
	NUMEDGES=$$(head $(GRAPH)/$(GRAPH).txt | tr ' ' '\n' | grep -a1 'Edges' | tail -n1); \
	[ ! -z "$${NUMEDGES##*[!0-9]*}" ] || NUMEDGES=$$(($$(wc -l < $(GRAPH)/$(GRAPH).txt))); \
	./sort $(GRAPH)/$(GRAPH).txt $$NUMEDGES true

.PHONY: union

decomp:
	./buffkcore \
		"$(GRAPH)/$(GRAPH).bin" \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).bin)/8)) \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).nodemap)/4)) \
		"$(GRAPH)/$(GRAPH).nodemap" \
		$$(($$(tail -c4 $(GRAPH)/$(GRAPH).nodemap | ./bindump.sh)))

.PHONY: decomp

dwave:
	FILENAME=$$(echo $(GRAPH)/$(GRAPH)_layers/*-$$(python -c "import sys, json; print(json.load(sys.stdin)['$(LAYER)']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json).csv); \
	./wave \
		$(GRAPH)/$(GRAPH)_layers \
		"$$FILENAME" \
		$(LAYER) \
		$$(python -c "import sys, json; x=json.load(sys.stdin)['$(LAYER)']; print(2*x['edges'],x['vertices'])" < $(GRAPH)/$(GRAPH)-layer-info.json) \
		$(GRAPH)/$(GRAPH).nodemap \
		$$(($$(tail -c4 $(GRAPH)/$(GRAPH).nodemap | ./bindump.sh))) \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).nodemap)/4))

.PHONY: decomp

ccs:
	FILENAME=$$(echo $(GRAPH)/$(GRAPH)_layers/*-$$(python -c "import sys, json; print(json.load(sys.stdin)['$(LAYER)']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json).csv); \
	[ -f "$$FILENAME" ] || FILENAME=$(GRAPH)/$(GRAPH); \
	./connectedcomponents "$$FILENAME" $(LAYER) $(GRAPH)/$(GRAPH)_layers

.PHONY: ccs

bccs:
	FILENAME=$$(echo $(GRAPH)/$(GRAPH)_layers/*-$$(python -c "import sys, json; print(json.load(sys.stdin)['$(LAYER)']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json).csv); \
	[ -f "$$FILENAME" ] || FILENAME=$(GRAPH)/$(GRAPH); \
	./biconnectedcomponents \
		"$$FILENAME" \
		$(LAYER) \
		$(GRAPH)/$(GRAPH)_layers \
		$(WAVE) \
		$$(($$(tail -c4 $(GRAPH)/$(GRAPH).nodemap | ./bindump.sh)))

.PHONY: bccs

cc-layers:
	for FILE in $$(ls $(GRAPH)/$(GRAPH)_layers -v | grep .csv); do \
		echo $$FILE; \
		./cc-layers-mat $(GRAPH)/$(GRAPH)_layers/"$$FILE" $(GRAPH)/$(GRAPH).cc $(GRAPH)/$(GRAPH)_layers; \
	done

.PHONY: cc-layers

waves:
	for FILE in $$(ls $(GRAPH)/$(GRAPH)_layers -v | grep .cc-info.json); do \
		echo $$FILE; \
		LAYER=$${FILE:6:-13}; \
		NUM=$$(python -c "import sys, json; x=json.load(sys.stdin); print(x[sorted(x,key=lambda k:x[k].get('edges',0))[-1]]['edges'])" < $(GRAPH)/$(GRAPH)_layers/"$$FILE"); \
		if (($$NUM > 2**16)); then \
			echo Layer: $$LAYER; \
			FILENAME=$$(echo $(GRAPH)/$(GRAPH)_layers/*-$$(python -c "import sys, json; print(json.load(sys.stdin)['$$LAYER']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json).csv); \
			./wave \
				$(GRAPH)/$(GRAPH)_layers \
				"$$FILENAME" \
				$$LAYER \
				$$(python -c "import sys, json; x=json.load(sys.stdin)['$$LAYER']; print(2*x['edges'],x['vertices'])" < $(GRAPH)/$(GRAPH)-layer-info.json) \
				$(GRAPH)/$(GRAPH).nodemap \
				$$(($$(tail -c4 $(GRAPH)/$(GRAPH).nodemap | ./bindump.sh))) \
				$$(($$(wc -c < $(GRAPH)/$(GRAPH).nodemap)/4)); \
		fi; \
	done

.PHONY: waves

bicntcomps:
	for FILE in $$(ls $(GRAPH)/$(GRAPH)_waves -v | grep waves-info.json); do \
		echo $$FILE; \
		LAYER=$${FILE:6:-16}; \
		WAVES=$$(python -c "import sys, json; print(' '.join([x[0] for x in filter(lambda y:y[1].get('edges',0)>2**16,json.load(sys.stdin).items())]))" < $(GRAPH)/$(GRAPH)_waves/"$$FILE"); \
		for WAVE in $$WAVES; do \
			echo Layer: $$LAYER; \
			echo Wave: $$WAVE; \
			FILENAME=$$(echo $(GRAPH)/$(GRAPH)_layers/*-$$(python -c "import sys, json; print(json.load(sys.stdin)['$$LAYER']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json).csv); \
			./biconnectedcomponents \
				"$$FILENAME" \
				$$LAYER \
				$(GRAPH)/$(GRAPH)_layers \
				$$WAVE \
				$$(($$(tail -c4 $(GRAPH)/$(GRAPH).nodemap | ./bindump.sh))); \
		done; \
	done

.PHONY: bicntcomps

bstats:
	echo $$(($$(wc -c < $(GRAPH)/$(GRAPH).bin)/8)), $$(($$(wc -c < $(GRAPH)/$(GRAPH).nodemap)/4)), $$(($$(tail -c4 $(GRAPH)/$(GRAPH).nodemap | ./bindump.sh)))

.PHONY: bstats

lstats:
	echo \
		$$(python -c "import sys, json; x=json.load(sys.stdin)['$(LAYER)']; print(2*x['edges'],x['vertices'])" < $(GRAPH)/$(GRAPH)-layer-info.json) \
		$$(python -c "import sys, json; print(json.load(sys.stdin)['$(LAYER)']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json)

.PHONY: bstats
