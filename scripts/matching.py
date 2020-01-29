import fileinput
import pandas as pd
import networkx as nx
from MatchGraph import MatchGraph

MAX_EDGE = 3

G = nx.parse_edgelist((fileinput.input()), nodetype=int, create_using=MatchGraph)
