Thanks for using MMap.

Please read carefully before running MMap's algorithms:

the general format of command is

java -jar mmap.jar INSTRUCTION_NAME FILE_NAME CONFIGURATION(S)

Note that INSTRUCTION_NAME is NOT case-sensitive

Below are detailed explanations of each command we support.
=========================================

1. Convert text file to binary file:

Format: java -jar mmap.jar Convert TEXT_FILE_NAME
Example: java -jar mmap.jar Convert soc-LiveJournal1.txt

Note: Each line of the text file should contain two integer numbers, representing the source and target respectively, separated by tab or space. Lines starting with # or % at the beginning of the file will be ignored.

-----------------------------------------

2. Connected Component

Format: java -jar mmap.jar ConnectedComponent BIN_FILE_NAME NODE_NUMBER
Example: java -jar mmap.jar ConnectedComponent soc-LiveJournal1.txt.bin 4847571

-----------------------------------------

3. PageRank

Format: java -jar mmap.jar PageRank BIN_FILE_NAME NODE_NUMBER NUMBER_OF_ITERATION
Example: java -jar mmap.jar PageRank soc-LiveJournal1.txt.bin 4847571 3

----------------------------------------

4. Triangle Counting

Format: java -jar mmap.jar TriangleCounting BIN_FILE_NAME NODE_NUMBER
Example: java -jar mmap.jar TriangleCounting soc-LiveJournal1.txt.bin 4847571

-----------------------------------------

5. One Step Neighbor

Format: java -jar mmap.jar OneStepNeighbor BIN_FILE_NAME NODE_NUMBER SOURCE_NODE_ID
Example: java -jar mmap.jar OneStepNeighbor soc-LiveJournal1.txt.bin 4847571 1000

-----------------------------------------

5. Two Step Neighbor

Format: java -jar mmap.jar TwoStepNeighbor BIN_FILE_NAME NODE_NUMBER SOURCE_NODE_ID
Example: java -jar mmap.jar TwoStepNeighbor soc-LiveJournal1.txt.bin 4847571 1000
