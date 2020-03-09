import sys
import pandas as pd
import networkx as nx
from MatchGraph import MatchGraph

MAX_EDGE = 3


delim = ' '
if len(sys.argv) > 2:
    delim = sys.argv[2]

with open(sys.argv[1]) as f:
    elist = [' '.join(x.strip().split(delim)[:2]) for x in f.readlines()]

G = nx.parse_edgelist(elist, nodetype=int, create_using=MatchGraph)
