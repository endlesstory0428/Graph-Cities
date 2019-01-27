GRAPH := simplegraph

PRODUCT := atlas-decomposition

CXX := g++
LINKER := g++
CXXFLAGS := -std=c++11 -Wall -Wextra
LNKFLAGS := -fopenmp -O3 -pthread

SRCFILES := src/intermkcore.cpp
# SRCFILES := $(wildcard src/*.cpp)
OBJFILES := $(patsubst %.cpp,%.o,$(SRCFILES))

$(PRODUCT): $(OBJFILES)
	$(LINKER) $(LNKFLAGS) $^ -o $@

%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCDIRS) -c $< -o $@

clean:
	rm -f $(PRODUCT) $(OBJFILES)

.PHONY: clean

mmap:
	java -jar mmap.jar Convert $(GRAPH)/$(GRAPH)

.PHONY: mmap

sanitize:
	cat $(GRAPH)/$(GRAPH).txt | grep -v '#' | sort -nk 1 | uniq | tr -d '\r' | awk '$$1 != $$2 {print $$1"\t"$$2}' > $(GRAPH)/$(GRAPH)
	cat $(GRAPH)/$(GRAPH) | tr '\t' '\n' | sort -nu  > $(GRAPH)/$(GRAPH).nodemap

.PHONY: sanitize

decomp:
	./atlas-decomposition $(GRAPH)/$(GRAPH).bin $$(($$(wc -c < $(GRAPH)/$(GRAPH).bin)/8)) $$(($$(wc -l < $(GRAPH)/$(GRAPH).nodemap))) $(GRAPH)/$(GRAPH).nodemap $$(($$(tail -n 1 $(GRAPH)/$(GRAPH).nodemap)))

.PHONY: decomp

bstats:
	echo $$(($$(wc -c < $(GRAPH)/$(GRAPH).bin)/8)), $$(($$(wc -l < $(GRAPH)/$(GRAPH).nodemap))), $$(($$(tail -n 1 $(GRAPH)/$(GRAPH).nodemap)))

.PHONY: bstats
