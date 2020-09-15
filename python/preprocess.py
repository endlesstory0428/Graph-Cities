import numpy as np
import scipy.spatial
from scipy.spatial import Voronoi
from scipy.spatial import voronoi_plot_2d

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
    spiral_file = open('../data/SPIRAL.txt','r')
    lines = spiral_file.readlines()
    for l in lines:
        line = l.split(' ')
        point = [line[1], line[2]]
        points.append(point)
        original_name = line[0]
        # point_name = original_name[8:original_name.rfind('_')]
        point_name = "wavemap_"+original_name[8:]
        names.append(point_name)
        spiral_points[point_name] = point
    print(names)
    vor = Voronoi(points)
    # voronoi_plot_2d(vor)
    createVoronoiText(vor,names,points)
    createVoronoiNeighborsText(vor,names)

if __name__ == '__main__':
    main()