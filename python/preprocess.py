import numpy as np
import scipy.spatial
from scipy.spatial import Voronoi
from scipy.spatial import voronoi_plot_2d
import sys

from itertools import combinations

# SPIRAL_FILE = '../data/com-friendster/SPIRAL.txt'
# SPIRAL_FILE = '../data/cit-Patents/SPIRAL.txt'
# SPIRAL_FILE = '../data/movies/SPIRAL.txt'
SPIRAL_FILE = f'../data/{sys.argv[1]}/SPIRAL.txt'

def createVoronoiText(vor,names,points):
    file = open('voronoi.txt','w')
    for i in range(len(points)):
        point_region = vor.point_region[i]
        regions = vor.regions[point_region]
        regions_coord = []
        for r in regions:
            coord = vor.vertices[r]
            regions_coord.append(str(coord[0].item()))
            regions_coord.append(str(coord[1].item()))
        regions_string = ' '.join(regions_coord)
        line = f'{names[i]} {regions_string}\n'
        file.write(line)
    file.close()

def createVoronoiNeighborsText(vor,names):
    file = open('neighbors.txt','w')
    for i in range(len(vor.ridge_points)):
        building_i_1=vor.ridge_points[i][0]
        building_i_2=vor.ridge_points[i][1]
        line = f'{names[building_i_1]} {names[building_i_2]}\n'
        # print(names[building_i_1],names[building_i_2])
        file.write(line)
    # file.write(vor.ridge_points)
    # print(vor.ridge_points)

def main():
    points, names = [], []
    spiral_points = {}
    spiral_file = open(SPIRAL_FILE,'r')
    lines = spiral_file.readlines()
    for l in lines:
        if l[:4] != 'wave':
            continue
        line = l.split(' ')
        point = [line[1], line[2]]
        points.append(point)
        original_name = line[0]
        # point_name = original_name[8:original_name.rfind('_')]
        point_name = "wavemap_"+original_name[8:]
        names.append(point_name)
        spiral_points[point_name] = point
    print(names)
    if len(points) < 4:
        with open('voronoi.txt','w') as f:
            for idx, name in enumerate(names):
                f.write(f'{name} {idx} {idx} {idx} {idx}\n')
        with open('neighbors.txt','w') as f:
            for name1, name2 in combinations(names, 2):
                f.write(f'{name1} {name2}\n')

    else:
        vor = Voronoi(points)
        # voronoi_plot_2d(vor)
        createVoronoiText(vor,names,points)
        createVoronoiNeighborsText(vor,names)

if __name__ == '__main__':
    main()
