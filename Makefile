GRAPH := simplegraph
LAYER := 0
WAVE := 0

PRODUCT := buffkcore wave connectedcomponents biconnectedcomponents cc-layers-mat

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
	cat $(GRAPH)/$(GRAPH).txt | grep -v '#' | sort -nk 1 | uniq | tr -d '\r' | awk '$$1 != $$2 {print $$1"\t"$$2}' > $(GRAPH)/$(GRAPH)
	cat $(GRAPH)/$(GRAPH) | tr '\t' '\n' | sort -nu  > $(GRAPH)/$(GRAPH).nodemap

.PHONY: sanitize

union:
	mv $(GRAPH)/$(GRAPH) $(GRAPH)/$(GRAPH)-dir.txt
	cat $(GRAPH)/$(GRAPH)-dir.txt | awk '{print $$0"\n"$$2"\t"$$1}' | sort -nk 1 | uniq > $(GRAPH)/$(GRAPH)

.PHONY: union

mmap:
	java -jar mmap.jar Convert $(GRAPH)/$(GRAPH)

.PHONY: mmap

decomp:
	./buffkcore \
		"$(GRAPH)/$(GRAPH).bin" \
		$$(($$(wc -c < $(GRAPH)/$(GRAPH).bin)/8)) \
		$$(($$(wc -l < $(GRAPH)/$(GRAPH).nodemap))) \
		"$(GRAPH)/$(GRAPH).nodemap" \
		$$(($$(tail -n 1 $(GRAPH)/$(GRAPH).nodemap)))

.PHONY: decomp

dwave:
	FILENAME=$$(echo $(GRAPH)/$(GRAPH)_layers/*-$$(python -c "import sys, json; print(json.load(sys.stdin)['$(LAYER)']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json).csv); \
	./wave \
		$(GRAPH)/$(GRAPH)_layers \
		"$$FILENAME" \
		$(LAYER) \
		$$(python -c "import sys, json; x=json.load(sys.stdin)['$(LAYER)']; print(2*x['edges'],x['vertices'])" < $(GRAPH)/$(GRAPH)-layer-info.json) \
		$(GRAPH)/$(GRAPH).nodemap \
		$$(($$(tail -n 1 $(GRAPH)/$(GRAPH).nodemap))) \
		$$(($$(wc -l < $(GRAPH)/$(GRAPH).nodemap)))

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
		$$(($$(tail -n 1 $(GRAPH)/$(GRAPH).nodemap)))

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
		NUM=$$(python -c "import sys, json; x=json.load(sys.stdin); print(x[sorted(x,key=lambda k:x[k].get('vertices',0))[-1]]['vertices'])" < $(GRAPH)/$(GRAPH)_layers/"$$FILE"); \
		if (($$NUM > 2000)); then \
			echo Layer: $$LAYER; \
			FILENAME=$$(echo $(GRAPH)/$(GRAPH)_layers/*-$$(python -c "import sys, json; print(json.load(sys.stdin)['$$LAYER']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json).csv); \
			./wave \
				$(GRAPH)/$(GRAPH)_layers \
				"$$FILENAME" \
				$$LAYER \
				$$(python -c "import sys, json; x=json.load(sys.stdin)['$$LAYER']; print(2*x['edges'],x['vertices'])" < $(GRAPH)/$(GRAPH)-layer-info.json) \
				$(GRAPH)/$(GRAPH).nodemap \
				$$(($$(tail -n 1 $(GRAPH)/$(GRAPH).nodemap))) \
				$$(($$(wc -l < $(GRAPH)/$(GRAPH).nodemap))); \
		fi; \
	done

.PHONY: waves

bicntcomps:
	for FILE in $$(ls $(GRAPH)/$(GRAPH)_waves -v | grep waves-info.json); do \
		echo $$FILE; \
		LAYER=$${FILE:6:-16}; \
		WAVES=$$(python -c "import sys, json; print(' '.join([x[0] for x in filter(lambda y:y[1].get('edges',0)>2**14,json.load(sys.stdin).items())]))" < $(GRAPH)/$(GRAPH)_waves/"$$FILE"); \
		for WAVE in $$WAVES; do \
			echo Layer: $$LAYER; \
			echo Wave: $$WAVE; \
			FILENAME=$$(echo $(GRAPH)/$(GRAPH)_layers/*-$$(python -c "import sys, json; print(json.load(sys.stdin)['$$LAYER']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json).csv); \
			./biconnectedcomponents \
				"$$FILENAME" \
				$$LAYER \
				$(GRAPH)/$(GRAPH)_layers \
				$$WAVE \
				$$(($$(tail -n 1 $(GRAPH)/$(GRAPH).nodemap))); \
		done; \
	done

.PHONY: bicntcomps

bstats:
	echo $$(($$(wc -c < $(GRAPH)/$(GRAPH).bin)/8)), $$(($$(wc -l < $(GRAPH)/$(GRAPH).nodemap))), $$(($$(tail -n 1 $(GRAPH)/$(GRAPH).nodemap)))

.PHONY: bstats

lstats:
	echo \
		$$(python -c "import sys, json; x=json.load(sys.stdin)['$(LAYER)']; print(2*x['edges'],x['vertices'])" < $(GRAPH)/$(GRAPH)-layer-info.json) \
		$$(python -c "import sys, json; print(json.load(sys.stdin)['$(LAYER)']['file_suffix'])" < $(GRAPH)/$(GRAPH)-layer-info.json)

.PHONY: bstats
