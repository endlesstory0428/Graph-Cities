import sys
import csv
import numpy as np
import matplotlib.pyplot as plt

graph = sys.argv[1]

degList = np.loadtxt(f'{graph}/{graph}.deg', dtype = np.uint32, delimiter = ',')
deg = degList[:, 1]

val, count = np.unique(deg, return_counts = True)
plt.scatter(val, count, alpha = 0.5)
plt.xlabel('degree')
plt.ylabel('frequency')
plt.title(f'degree distribution')
plt.xscale('log')
plt.yscale('log')
plt.savefig(f'{graph}_deg.png')