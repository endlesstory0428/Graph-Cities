# draw Vonoroi graph with Graph City data
import matplotlib.pyplot as plt
import numpy as np
import math
import sys
import scipy.spatial
from scipy.spatial import Voronoi
from scipy.spatial import voronoi_plot_2d

def get_voronoi_vertices(vor, spiral_index):
    region = vor.point_region[spiral_index]
    print("for spiral index {}".format(spiral_index))
    vertices = vor.regions[region]
    return(vertices)

def plan_full_path(vor, path_point_index, path_vertex_index):
    path = [vor.points[path_point_index[0]]]
    for i in range(len(path_vertex_index)-1):
        point_index = path_point_index[i+1]
        point_region = vor.point_region[point_index] # index of region
        region = vor.regions[point_region] # index of vertices in a region
        A_index = path_vertex_index[i]
        B_index = path_vertex_index[i+1]
        A = region.index(A_index)
        B = region.index(B_index)
        path.append(vor.vertices[A_index]) # append first vertex in a region
        print(region)
        # print("start {} end {}".format(A_index,B_index))
        # for v in region:
            # print(vor.vertices[v])
        if(A < B):
            direction_1 = B-A
            direction_2 = len(region)-direction_1
            if(direction_1 <= direction_2): # go right
                # print("go right")
                for j in range(A+1,B):
                    path.append(vor.vertices[region[j]])
            else: 
                print("go left")
                for j in range(A,-1,-1):
                    path.append(vor.vertices[region[j]])
                for j in range(len(region)-1,B-1,-1):
                    print(j)
                    path.append(vor.vertices[region[j]])
        elif(A > B):
            direction_1 = A-B
            direction_2 = len(region)-direction_1
            if(direction_1 < direction_2): # go left
                # print("go left")
                for j in range(A-1,B,-1):
                    path.append(vor.vertices[region[j]])
            else:
                # print("go right")
                for j in range(A+1,len(region)):
                    path.append(vor.vertices[region[j]])
                for j in range(0,B):
                    path.append(vor.vertices[region[j]])
    path.append(vor.vertices[path_vertex_index[-1]])
    path.append(vor.points[path_point_index[-1]])
    return path

def plan_path_between(vor, graph, names, points, start_point, end_point, path_color):
    path = bfs(graph, start_point, end_point)
    print("path between {} and {} is".format(start_point,end_point))
    print(path)

    path_point_index = []
    for p in path:
        path_point_index.append(names.index(p))
    # print(path_point_index)

    # check if the point pair has ridge (voronoi edge) between them
    ridge_list = []
    for i in range(len(path_point_index)-1):
        ridge_list.append(ridge_between_points(vor, path_point_index[i], path_point_index[i+1]))
    # print(f'ridge list: {ridge_list}')

    # find closes voronoi vertex on a ridge
    start_coord = points[names.index(start_point)]
    start_coord = [float(i) for i in start_coord]
    end_coord = points[names.index(end_point)]
    end_coord = [float(i) for i in end_coord]
    path_vertex = [start_coord]
    path_vertex_index = [] # list of voronoi vertex index, excluding start and end points
    for i in range(len(ridge_list)):
        # print(f'ridge_list[{i}] = {ridge_list[i]}')
        vertex_pair = vor.ridge_vertices[ridge_list[i]]
        O = path_vertex[-1]
        A_index = vertex_pair[0]
        B_index = vertex_pair[1]
        A = vor.vertices[A_index]
        B = vor.vertices[B_index]
        # C = (A+B)/2 # midpoint of A and B
        # path_vertex.append(C.tolist())
        distance_A = math.hypot(A[0]-O[0],A[1]-O[1])
        distance_B = math.hypot(B[0]-O[0],B[1]-O[1])
        # print(distance_A, distance_B)
        if(A_index < 0):
            path_vertex.append(B.tolist())
            path_vertex_index.append(B_index)
            # print("B added")
        elif(B_index < 0):
            path_vertex.append(A.tolist())
            path_vertex_index.append(A_index)
            # print("A added")                
        elif(distance_A <= distance_B):
            path_vertex.append(A.tolist())
            path_vertex_index.append(A_index)
            # print("A added")
        else:
            path_vertex.append(B.tolist())
            path_vertex_index.append(B_index)
            # print("B added")
    path_vertex.append(end_coord)
    
    # path_vertex_x = [x[0] for x in path_vertex]
    # path_vertex_y = [x[1] for x in path_vertex]
    # plt.plot(path_vertex_x, path_vertex_y, linewidth=2)
    
    path_full = plan_full_path(vor, path_point_index, path_vertex_index)
    path_full_x = [x[0] for x in path_full]
    path_full_y = [x[1] for x in path_full]
    plt.plot(path_full_x, path_full_y, linewidth=2,color=path_color)

def draw_between_adjacent(vor, graph, names, points, start_point, end_point, path_color):
    print("draw between adjacent {} and {}".format(start_point,end_point))
    path = [start_point, end_point]
    path_point_index = []
    for p in path:
        path_point_index.append(names.index(p))
    # print(path_point_index)

    # check if the point pair has ridge (voronoi edge) between them
    ridge_list = []
    for i in range(len(path_point_index)-1):
        ridge_list.append(ridge_between_points(vor, path_point_index[i], path_point_index[i+1]))
    # print(f'ridge list: {ridge_list}')

    # find closes voronoi vertex on a ridge
    start_coord = points[names.index(start_point)]
    start_coord = [float(i) for i in start_coord]
    end_coord = points[names.index(end_point)]
    end_coord = [float(i) for i in end_coord]
    path_vertex = [start_coord]
    path_vertex_index = [] # list of voronoi vertex index, excluding start and end points
    for i in range(len(ridge_list)):
        # print(f'ridge_list[{i}] = {ridge_list[i]}')
        vertex_pair = vor.ridge_vertices[ridge_list[i]]
        O = path_vertex[-1]
        A_index = vertex_pair[0]
        B_index = vertex_pair[1]
        A = vor.vertices[A_index]
        B = vor.vertices[B_index]
        # C = (A+B)/2 # midpoint of A and B
        # path_vertex.append(C.tolist())
        distance_A = math.hypot(A[0]-O[0],A[1]-O[1])
        distance_B = math.hypot(B[0]-O[0],B[1]-O[1])
        # print(distance_A, distance_B)
        if(A_index < 0):
            path_vertex.append(B.tolist())
            path_vertex_index.append(B_index)
            # print("B added")
        elif(B_index < 0):
            path_vertex.append(A.tolist())
            path_vertex_index.append(A_index)
            # print("A added")                
        elif(distance_A <= distance_B):
            path_vertex.append(A.tolist())
            path_vertex_index.append(A_index)
            # print("A added")
        else:
            path_vertex.append(B.tolist())
            path_vertex_index.append(B_index)
            # print("B added")
    path_vertex.append(end_coord)
    
    # path_vertex_x = [x[0] for x in path_vertex]
    # path_vertex_y = [x[1] for x in path_vertex]
    # plt.plot(path_vertex_x, path_vertex_y, linewidth=2)
    
    path_full = plan_full_path(vor, path_point_index, path_vertex_index)
    path_full_x = [x[0] for x in path_full]
    path_full_y = [x[1] for x in path_full]
    plt.plot(path_full_x, path_full_y, linewidth=2,color=path_color)

def bfs(graph, start, goal):
    queue = [[start]]
    visited = []
    while queue:
        path = queue.pop(0)
        node = path[-1]
        if node not in visited:
            neighbours = graph[node]
            for neighbour in neighbours:
                new_path = list(path)
                new_path.append(neighbour)
                queue.append(new_path)
                if neighbour == goal:
                    return new_path
            visited.append(node)
    return "The path does not exist"

def bfs_2(graph, start, vor, points, names, path_color):
    queue = [[start]]
    visited = []
    visited_neighbours = []
    while queue:
        path = queue.pop(0)
        node = path[-1]
        if node not in visited:
            neighbours = graph[node]
            for neighbour in neighbours:
                new_path = list(path)
                new_path.append(neighbour)
                queue.append(new_path)
                start_point = node
                end_point = neighbour
                if neighbour not in visited_neighbours:
                    draw_between_adjacent(vor, graph, names, points, start_point, end_point, path_color)
                    visited_neighbours.append(neighbour)
            visited.append(node)
    return "The path does not exist"

# get index of ridge (voronoi edge) between two points
def ridge_between_points(vor, point_A, point_B):
    ridge_point = -1
    try:
        ridge_point = vor.ridge_points.tolist().index([point_A,point_B])
    except ValueError:
        pass
        # print("ridge not in list")
    try:
        ridge_point = vor.ridge_points.tolist().index([point_B,point_A])
    except ValueError:
        pass
        # print("ridge not in list").
    return ridge_point

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
        point_name = original_name[8:original_name.rfind('_')]
        names.append(point_name)
        spiral_points[point_name] = point
    # print(names)
    vor = Voronoi(points)
    voronoi_plot_2d(vor)

    # create a graph from spiral points
    graph = {}
    for ridge in vor.ridge_points:
        point_A = names[ridge[0]]
        point_B = names[ridge[1]]
        if point_A in graph:
            graph[point_A].append(point_B)
        else: 
            graph[point_A] = [point_B]
        if point_B in graph:
            graph[point_B].append(point_A)
        else:
            graph[point_B] = [point_A]
    # print(graph)
    for i in range(len(names)):
        print(f'{i}: {names[i]}')

    # set start and end points with user inputs
    # print(*names,sep='\n')
    # start_point = input('Please enter the start:\n')
    # if start_point in names:
    #     print(f'You chose {start_point} as the start')
    # else:
    #     while start_point not in names:
    #         start_point = input('Please re-enter the start:\n')
    
    # end_point = input('Please enter the end:\n')
    # if end_point in names:
    #     print(f'You chose {end_point} as the end')
    # else:
    #     while end_point not in names:
    #         end_point = input('Please re-enter the end:\n')    

    # set arbitrary start and end points
    # start_point = '22_6161'
    # end_point = '37_49855555'
    # path_color = 'green'
    # plan_path_between(vor, graph, names, points,start_point, end_point, path_color)
    # start_point = '40_38645'
    # end_point = '80_49855703'
    # path_color = 'blue'
    # plan_path_between(vor, graph, names, points,start_point, end_point, path_color)
    
    start_point = '22_6161'
    # end_point = '169_11459'
    path_color = 'green'

    # draw from start to every other buildings (create loops)
    # for i in range(0,len(names)):
    #     end_point = names[i]
    #     print(f'start_point: {start_point}, end_point: {end_point}')
    #     plan_path_between(vor, graph, names, points,start_point, end_point, path_color)
    # plan_path_between(vor, graph, names, points,start_point, end_point, path_color)
    
    bfs_2(graph, start_point, vor, points, names, path_color)
    plt.show() #draw the Voronoi image

if __name__ == '__main__':
    main()