import sys
from math import cos, sin, pi
import matplotlib.pyplot as plt

L = 36
W = L / 1.618  # the golden rectangle ratio
alpha = 30
beta = 7.5

# buckets = []
buckets = range(int(sys.argv[1]))

# plt.axes()

acc_theta = 0
for bucket in buckets:
    radius = alpha + beta * acc_theta
    x = radius * cos(acc_theta)
    y = radius * sin(acc_theta) * 0.95
    box_theta = acc_theta * 180 / pi + 90
    d_theta = (L * 1.4) / radius
    acc_theta += d_theta

    # plt.gca().add_patch(plt.Rectangle((x, y), L, W, box_theta))
    print(plt.Rectangle((x, y), L, W, box_theta))

# plt.axis('scaled')
# plt.show()
