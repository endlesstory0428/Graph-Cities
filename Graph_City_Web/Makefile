SHELL := $(shell which bash)
PYTHON := $(shell which python3)
DIR := $(shell pwd)
GRAPH := simplegraph

retrive:
	ln -s ../wave-decomposition/${GRAPH} ${GRAPH}; \
	ln -s ../wave-decomposition/${GRAPH}/cityMesh data/${GRAPH}; \
	ln -s ../wave-decomposition/${GRAPH}/dag data_dags/${GRAPH}; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-summary.json data/; \
	cp wave-decomposition/${GRAPH}/building2bucket-${GRAPH}.json data_maps/; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-lccWaves.vBuck.b.p.mm.json data_maps/; \
	touch data_maps/${GRAPH}-patterns.txt; \
	echo '{}' > data_maps/${GRAPH}-dagSize.json; \
	cd $(DIR)/python; \
	python3 preprocess.py ${GRAPH}; \
	mkdir ${GRAPH}; \
	mv neighbors.txt ${GRAPH}/; \
	mv voronoi.txt ${GRAPH}/; \
	python3 path.py ${GRAPH}; \
	cp ../wave-decomposition/${GRAPH}/metagraph_normalized.txt ${GRAPH}/; \
	cd $(DIR); \
	cp wave-decomposition/${GRAPH}/${GRAPH}_entropy.json scripts/lighthouse/; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-layers-dists.json scripts/lighthouse/; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-bucket2peels.json scripts/lighthouse/; \
	cd $(DIR)/wave-decomposition; \
	python3 scripts/freqUsed/degPlot.py ${GRAPH}; \
	cd $(DIR); \
	mv wave-decomposition/${GRAPH}_deg.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_tallest_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_largest_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_floor_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_diverse_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_densest_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_lcc_dist.png data/; \
	cp index.html.template index-$(GRAPH).html; \
	cp scripts/main.js scripts/main_$(GRAPH).js; \
	sed -i '1006s/main.js/main_$(GRAPH).js/' index-$(GRAPH).html; \
	sed -i '120s/.*/const data_list = ["got", "$(GRAPH)", "starwars"]/' scripts/main_$(GRAPH).js;

retrive-vicinity:
	ln -s ../wave-decomposition/${GRAPH} ${GRAPH}; \
	ln -s ../wave-decomposition/${GRAPH}/cityMesh data/${GRAPH}; \
	ln -s ../wave-decomposition/${GRAPH}/dag data_dags/${GRAPH}; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-summary.json data/; \
	cp wave-decomposition/${GRAPH}/building2bucket-${GRAPH}.json data_maps/; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-lccWaves.vBuck.b.p.mm.json data_maps/; \
	touch data_maps/${GRAPH}-patterns.txt; \
	echo '{}' > data_maps/${GRAPH}-dagSize.json; \
	cd $(DIR)/python; \
	python3 preprocess.py ${GRAPH}; \
	mkdir ${GRAPH}; \
	mv neighbors.txt ${GRAPH}/; \
	mv voronoi.txt ${GRAPH}/; \
	python3 path.py ${GRAPH}; \
	cp ../wave-decomposition/${GRAPH}/metagraph_normalized.txt ${GRAPH}/; \
	cd $(DIR); \
	cp wave-decomposition/${GRAPH}/${GRAPH}_entropy.json scripts/lighthouse/; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-layers-dists.json scripts/lighthouse/; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-bucket2peels.json scripts/lighthouse/; \
	cd $(DIR)/wave-decomposition; \
	python3 scripts/freqUsed/degPlot.py ${GRAPH}; \
	cd $(DIR); \
	mv wave-decomposition/${GRAPH}_deg.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_tallest_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_largest_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_floor_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_diverse_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_densest_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_lcc_dist.png data/; \
	cp index.html.template index-$(GRAPH).html; \
	cp scripts/main.js scripts/main_$(GRAPH).js; \
	sed -i '1006s/main.js/main_$(GRAPH).js/' index-$(GRAPH).html; \
	sed -i '120s/.*/const data_list = ["got", "$(GRAPH)", "starwars"]/' scripts/main_$(GRAPH).js; \
	sed -i '29c let vicinityFlag = true' scripts/main_$(GRAPH).js; \
	sed -i '30c let mallVicinityFlag = false' scripts/main_$(GRAPH).js; \
	sed -i '32c let sampleFlag = false' scripts/main_$(GRAPH).js;

retrive-vicinity-smp:
	ln -s ../wave-decomposition/${GRAPH} ${GRAPH}; \
	ln -s ../wave-decomposition/${GRAPH}/cityMesh data/${GRAPH}; \
	ln -s ../wave-decomposition/${GRAPH}/dag data_dags/${GRAPH}; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-summary.json data/; \
	cp wave-decomposition/${GRAPH}/building2bucket-${GRAPH}.json data_maps/; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-lccWaves.vBuck.b.p.mm.json data_maps/; \
	touch data_maps/${GRAPH}-patterns.txt; \
	echo '{}' > data_maps/${GRAPH}-dagSize.json; \
	cd $(DIR)/python; \
	python3 preprocess.py ${GRAPH}; \
	mkdir ${GRAPH}; \
	mv neighbors.txt ${GRAPH}/; \
	mv voronoi.txt ${GRAPH}/; \
	python3 path.py ${GRAPH}; \
	cp ../wave-decomposition/${GRAPH}/metagraph_normalized.txt ${GRAPH}/; \
	cd $(DIR); \
	cp wave-decomposition/${GRAPH}/${GRAPH}_entropy.json scripts/lighthouse/; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-layers-dists.json scripts/lighthouse/; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-bucket2peels.json scripts/lighthouse/; \
	cd $(DIR)/wave-decomposition; \
	python3 scripts/freqUsed/degPlot.py ${GRAPH}; \
	cd $(DIR); \
	mv wave-decomposition/${GRAPH}_deg.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_tallest_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_largest_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_floor_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_diverse_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_densest_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_lcc_dist.png data/; \
	cp index.html.template index-$(GRAPH).html; \
	cp scripts/main.js scripts/main_$(GRAPH).js; \
	sed -i '1006s/main.js/main_$(GRAPH).js/' index-$(GRAPH).html; \
	sed -i '120s/.*/const data_list = ["got", "$(GRAPH)", "starwars"]/' scripts/main_$(GRAPH).js; \
	sed -i '29c let vicinityFlag = true' scripts/main_$(GRAPH).js; \
	sed -i '30c let mallVicinityFlag = false' scripts/main_$(GRAPH).js; \
	sed -i '32c let sampleFlag = true' scripts/main_$(GRAPH).js;

retrive-mall:
	ln -s ../wave-decomposition/${GRAPH} ${GRAPH}; \
	ln -s ../wave-decomposition/${GRAPH}/cityMesh data/${GRAPH}; \
	ln -s ../wave-decomposition/${GRAPH}/dag data_dags/${GRAPH}; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-summary.json data/; \
	cp wave-decomposition/${GRAPH}/building2bucket-${GRAPH}.json data_maps/; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-lccWaves.vBuck.b.p.mm.json data_maps/; \
	touch data_maps/${GRAPH}-patterns.txt; \
	echo '{}' > data_maps/${GRAPH}-dagSize.json; \
	cd $(DIR)/python; \
	python3 preprocess.py ${GRAPH}; \
	mkdir ${GRAPH}; \
	mv neighbors.txt ${GRAPH}/; \
	mv voronoi.txt ${GRAPH}/; \
	python3 path.py ${GRAPH}; \
	cp ../wave-decomposition/${GRAPH}/metagraph_normalized.txt ${GRAPH}/; \
	cd $(DIR); \
	cp wave-decomposition/${GRAPH}/${GRAPH}_entropy.json scripts/lighthouse/; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-layers-dists.json scripts/lighthouse/; \
	cp wave-decomposition/${GRAPH}/${GRAPH}-bucket2peels.json scripts/lighthouse/; \
	cd $(DIR)/wave-decomposition; \
	python3 scripts/freqUsed/degPlot.py ${GRAPH}; \
	cd $(DIR); \
	mv wave-decomposition/${GRAPH}_deg.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_tallest_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_largest_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_floor_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_diverse_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_densest_dist.png data/; \
	mv wave-decomposition/$(GRAPH)/${GRAPH}_lcc_dist.png data/; \
	cp index.html.template index-$(GRAPH).html; \
	cp scripts/main.js scripts/main_$(GRAPH).js; \
	sed -i '1006s/main.js/main_$(GRAPH).js/' index-$(GRAPH).html; \
	sed -i '120s/.*/const data_list = ["got", "$(GRAPH)", "starwars"]/' scripts/main_$(GRAPH).js; \
	sed -i '29c let vicinityFlag = true' scripts/main_$(GRAPH).js; \
	sed -i '30c let mallVicinityFlag = true' scripts/main_$(GRAPH).js;

update:
	cp index.html.template index-$(GRAPH).html; \
	cp scripts/main.js scripts/main_$(GRAPH).js; \
	sed -i '1006s/main.js/main_$(GRAPH).js/' index-$(GRAPH).html; \
	sed -i '120s/.*/const data_list = ["got", "$(GRAPH)", "starwars"]/' scripts/main_$(GRAPH).js;

update-vicinity:
	cp index.html.template index-$(GRAPH).html; \
	cp scripts/main.js scripts/main_$(GRAPH).js; \
	sed -i '1006s/main.js/main_$(GRAPH).js/' index-$(GRAPH).html; \
	sed -i '120s/.*/const data_list = ["got", "$(GRAPH)", "starwars"]/' scripts/main_$(GRAPH).js; \
	sed -i '29c let vicinityFlag = true' scripts/main_$(GRAPH).js; \
	sed -i '30c let mallVicinityFlag = false' scripts/main_$(GRAPH).js; \
	sed -i '32c let sampleFlag = false' scripts/main_$(GRAPH).js;

update-vicinity-smp:
	cp index.html.template index-$(GRAPH).html; \
	cp scripts/main.js scripts/main_$(GRAPH).js; \
	sed -i '1006s/main.js/main_$(GRAPH).js/' index-$(GRAPH).html; \
	sed -i '120s/.*/const data_list = ["got", "$(GRAPH)", "starwars"]/' scripts/main_$(GRAPH).js; \
	sed -i '29c let vicinityFlag = true' scripts/main_$(GRAPH).js; \
	sed -i '30c let mallVicinityFlag = false' scripts/main_$(GRAPH).js; \
	sed -i '32c let sampleFlag = true' scripts/main_$(GRAPH).js;

update-mall:
	cp index.html.template index-$(GRAPH).html; \
	cp scripts/main.js scripts/main_$(GRAPH).js; \
	sed -i '1006s/main.js/main_$(GRAPH).js/' index-$(GRAPH).html; \
	sed -i '120s/.*/const data_list = ["got", "$(GRAPH)", "starwars"]/' scripts/main_$(GRAPH).js; \
	sed -i '29c let vicinityFlag = true' scripts/main_$(GRAPH).js; \
	sed -i '30c let mallVicinityFlag = true' scripts/main_$(GRAPH).js;