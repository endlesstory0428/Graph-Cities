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
	java -jar mmap.jar Convert $(GRAPH)/edgelist
