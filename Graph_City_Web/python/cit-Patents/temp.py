import csv
import numpy as np
import matplotlib.pyplot as plt

data = []
with open('metagraph.txt') as f:
	reader = csv.reader(f)
	for row in reader:
		data.append(float(row[4]))

val, count = np.unique(data, return_counts = True)
print(np.max(data), np.min(data), np.mean(data), np.std(data))
plt.scatter(val, count)
plt.xscale('log')
plt.show()