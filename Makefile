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

sanitize:
	cat $(GRAPH)/$(GRAPH).txt | grep -v '#' | sort -nk 1 | uniq | tr -d '\r' | awk '$$1 != $$2' > $(GRAPH)/$(GRAPH)

decomp:
	./atlas-decomposition $(GRAPH)/$(GRAPH).bin $$(($$(wc -c $(GRAPH)/$(GRAPH).bin | awk -F ' ' '{print $$1}')/8)) $$(($$(tail -c4 $(GRAPH)/$(GRAPH).bin | ./bindump.sh)))
