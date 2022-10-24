import numpy as np
import time
import csv

# deg = np.zeros(4780950910, dtype = np.uint32)
# # deg = np.zeros(20, dtype = np.uint32)

# oDeg = np.loadtxt('oDeg.txt', dtype = np.int64, delimiter = ' ')
# deg[oDeg[:, 1]] += oDeg[:, 0].astype(np.uint32)

# del oDeg
# print('oDeg done')

# iDeg = np.loadtxt('iDeg.txt', dtype = np.int64, delimiter = ' ')
# deg[iDeg[:, 1]] += iDeg[:, 0].astype(np.uint32)

# del iDeg
# print('iDeg done')

# np.save('./deg.npy', deg)

deg = np.load('./deg.npy')

aveDeg = 9.424636391258593

deg = deg[deg >= aveDeg]

eSize = 5718412128
vSize = np.sum(deg != 0)
aveDeg = eSize / vSize * 2
print(eSize, vSize, aveDeg)

deg = deg[deg >= aveDeg]



with open('sizeInfo.log', 'a') as f:
	f.write(f'E: {eSize}, V: {vSize}, aveDeg: {aveDeg}')

aboveAve = deg >= aveDeg

del deg
print('aveDeg done')

start = time.time()
with open('web-ClueWeb09_R.txt') as fr:
	with open('web-ClueWeb09_R_R.txt', 'w', newline = '') as fwR:
		with open('web-ClueWeb09_R_L.txt', 'w', newline = '') as fwL:
			reader = csv.reader(fr, delimiter = '\t')
			writerR = csv.writer(fwR, delimiter = '\t')
			writerL = csv.writer(fwL, delimiter = '\t')
			for idx, row in enumerate(reader):
				if idx % 100_000_000 == 0:
					tempTime = time.time() - start
					print(idx, tempTime, idx / tempTime)
				x, y = map(int, row)
				if aboveAve[x] and aboveAve[y]:
					writerR.writerow((x, y))
				else:
					writerL.writerow((x, y))
