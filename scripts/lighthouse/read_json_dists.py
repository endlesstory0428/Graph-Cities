# reads JSON distribution files
# constructs a 3d mesh
import json
import math

def triangulate(lower,upper):
    faces = []
    if(len(lower) == len(upper)):
        l = len(lower)
        for i in range(len(lower)):
            face = []
            face.append(lower[i%l])
            face.append(upper[i%l])
            face.append(upper[(i+1)%l])
            faces.append(face)
            face = []
            face.append(lower[(i+1)%l])
            face.append(lower[i%l])
            face.append(upper[(i+1)%l]) 
            faces.append(face)
        # print(len(faces))
        return faces
    else:
        lower_l = len(lower)
        upper_l = len(upper)
        if(lower_l < upper_l):
            ratio = upper_l/lower_l
            lower_c = 0
            upper_c = 0
            while(lower_c < lower_l or upper_c < upper_l):
                if(upper_c > ratio*lower_c):
                    face = []
                    face.append(lower[lower_c])
                    face.append(upper[upper_c%upper_l])
                    face.append(lower[(lower_c+1)%lower_l])
                    lower_c = lower_c + 1
                    faces.append(face)
                else:
                    face = []
                    face.append(upper[upper_c])
                    face.append(upper[(upper_c+1)%upper_l])
                    face.append(lower[lower_c%lower_l])
                    upper_c = upper_c + 1
                    faces.append(face)
        elif(lower_l > upper_l):
            ratio = lower_l/upper_l
            lower_c = 0
            upper_c = 0
            while(lower_c < lower_l or upper_c < upper_l):
                if(upper_c*ratio > lower_c):
                    face = []
                    face.append(lower[lower_c%lower_l])
                    face.append(upper[upper_c%upper_l])
                    face.append(lower[(lower_c+1)%lower_l])
                    lower_c = lower_c + 1
                    faces.append(face)
                else:
                    face = []
                    face.append(upper[upper_c%upper_l])
                    face.append(upper[(upper_c+1)%upper_l])
                    face.append(lower[lower_c%lower_l])
                    upper_c = upper_c + 1
                    faces.append(face)
        return faces
    return []

def draw_mesh_1():
    """star shaped polygon"""
    # f = open('movies-layers-dists.json')
    # f2 = open('movies.off','w')
    # f2.write('OFF\n933 1850 0\n')
    
    # f = open('cit-Patents-layers-dists.json')
    # f2 = open('cit-Patents.off','w')
    # f2.write('OFF\n1006 1996 0\n')

    # f = open('com-friendster-layers-dists.json')
    # f2 = open('com-friendster.off','w')
    # f2.write('OFF\n1340 2670 0\n')
    
    f = open('movies-excerpt.json')
    f2 = open('movies-excerpt.off','w')
    f2.write('OFF\n55 55 0\n')

    data = json.load(f)
    Y = 0 # base height
    X = Z = 0
    default_edges = 8
    v_count = f_count = 0
    start_pos = []
    for i in data:
        # print(i)
        # print(data[i])
        # print(len(data[i]),'\n')
        start_pos.append(v_count)
        if(len(data[i]) == 1):
            R = 10 # default radius
            for j in range(default_edges):
                theta = j * 2 * math.pi / default_edges
                X = R * math.cos(theta)
                Z = R * math.sin(theta)
                v_0 = "{:06f}".format(X)
                v_1 = "{:06f}".format(Y)
                v_2 = "{:06f}".format(Z)
                f2.write(v_0+' '+v_1+' '+v_2+'\n')
                v_count = v_count + 1
        else:
            toInt = []
            for j in data[i]:
                toInt.append(int(j))
            maximum = max(toInt)
            for j in toInt:
                theta = (j/maximum)*2*math.pi
                toStr = str(j)
                value = data[i][toStr]
                R = math.log2(value)
                # R = max(10,value)
                X = R * math.cos(theta)
                Z = R * math.sin(theta)
                v_0 = "{:06f}".format(X)
                v_1 = "{:06f}".format(Y)
                v_2 = "{:06f}".format(Z)
                if(R>10000):
                    print('R>10000',i,j,R,v_0,v_1,v_2)

                f2.write(v_0+' '+v_1+' '+v_2+'\n')
                v_count = v_count + 1
        Y = Y + 10
    start_pos.append(v_count)
    # print(start_pos)
    for i in range(len(start_pos)-2):
        lower = [*range(start_pos[i],start_pos[i+1])]
        upper = [*range(start_pos[i+1],start_pos[i+2])]
        # print('i',i,'lower')
        # print(lower)
        # print('upper')
        # print(upper)
        faces = triangulate(lower,upper)
        if(len(faces)>0):
            for f in faces:
                f2.write('3 '+str(f[0])+' '+str(f[1])+' '+str(f[2])+'\n')
                f_count = f_count + 1
    f2.close()
    print(v_count)
    print(f_count)

def draw_mesh_2():
    """disk stacks to be cylinder"""
    # f = open('movies-layers-dists.json')
    # f2 = open('movies-cylinder.off','w')
    # f2.write('OFF\n20672 41312 0\n')

    # f = open('cit-Patents-layers-dists.json')
    # f2 = open('cit-Patents-cylinder.off','w')
    # f2.write('OFF\n30400 60768 0\n')

    f = open('com-friendster-layers-dists.json')
    f2 = open('com-friendster-cylinder.off','w')
    f2.write('OFF\n35712 71392 0\n')

    data = json.load(f)
    Y = 0 # base height
    X = Z = 0
    default_edges = 16
    v_count = f_count = 0
    start_pos = []
    for i in data:
        # print(i)
        # print(data[i])
        # print(len(data[i]),'\n')
        for k in (data[i]):
            log_k = math.log2(int(data[i][k])) # height = frequency
            start_pos.append(v_count)
            R = 10*(math.log2(int(k)) + 1) # radius = second key
            # print("k =",k)
            for j in range(default_edges):
                theta = j * 2 * math.pi / default_edges
                X = R * math.cos(theta)
                Z = R * math.sin(theta)
                v_0 = "{:06f}".format(X)
                v_1 = "{:06f}".format(Y)
                v_2 = "{:06f}".format(Z)
                f2.write(v_0+' '+v_1+' '+v_2+'\n')
                v_count = v_count + 1
            Y = Y + log_k
            start_pos.append(v_count)
            for j in range(default_edges):
                theta = j * 2 * math.pi / default_edges
                X = R * math.cos(theta)
                Z = R * math.sin(theta)
                v_0 = "{:06f}".format(X)
                v_1 = "{:06f}".format(Y)
                v_2 = "{:06f}".format(Z)
                f2.write(v_0+' '+v_1+' '+v_2+'\n')
                v_count = v_count + 1
            Y = Y + 1
    
    start_pos.append(v_count) # last v_count
    # print(start_pos)
    for i in range(len(start_pos)-2):
        lower = [*range(start_pos[i],start_pos[i+1])]
        upper = [*range(start_pos[i+1],start_pos[i+2])]
        # print('i',i,'lower')
        # print(lower)
        # print('upper')
        # print(upper)
        faces = triangulate(lower,upper)
        if(len(faces)>0):
            for f in faces:
                f2.write('3 '+str(f[0])+' '+str(f[1])+' '+str(f[2])+'\n')
                f_count = f_count + 1
    f2.close()
    print(v_count)
    print(f_count)

def test_mesh():
    f2 = open('test.off','w')
    f2.write('OFF\n16 16 0\n')
    Y = 0
    default_edges = 8
    R = 10 # default radius
    v_count = 0
    for _ in range(2):
        for j in range(default_edges):
            theta = j * 2 * math.pi / default_edges
            X = R * math.cos(theta)
            Z = R * math.sin(theta)
            f2.write(str(X)+' '+str(Y)+' '+str(Z)+'\n')
            v_count = v_count + 1
        Y = Y + 10
    lower = [*range(0,8)]
    upper = [*range(8,16)]
    faces = triangulate(lower,upper)
    for f in faces:
        f2.write('3 '+str(f[0])+' '+str(f[1])+' '+str(f[2])+'\n')

def test_mesh_2():
    f2 = open('test_2.off','w')
    f2.write('OFF\n8 8 0\n')
    Y = 0
    R = 10 # default radius
    v_count = 0

    default_edges = 3
    for j in range(default_edges):
        theta = j * 2 * math.pi / default_edges
        X = R * math.cos(theta)
        Z = R * math.sin(theta)
        f2.write(str(X)+' '+str(Y)+' '+str(Z)+'\n')
        v_count = v_count + 1
    Y = Y + 10
    default_edges = 5
    for j in range(default_edges):
        theta = j * 2 * math.pi / default_edges
        X = R * math.cos(theta)
        Z = R * math.sin(theta)
        f2.write(str(X)+' '+str(Y)+' '+str(Z)+'\n')
        v_count = v_count + 1
    lower = [*range(0,3)]
    upper = [*range(3,8)]
    faces = triangulate(lower,upper)
    for f in faces:
        f2.write('3 '+str(f[0])+' '+str(f[1])+' '+str(f[2])+'\n')

# 3 0 8 9
# 3 1 0 9
# 3 1 9 10
# 3 2 1 10
# 3 2 10 11
# 3 3 2 11
# 3 3 11 12
# 3 4 3 12
# 3 4 12 13
# 3 5 4 13
# 3 5 13 14
# 3 6 5 14
# 3 6 14 15
# 3 7 6 15
# 3 7 15 8
# 3 0 7 8
if __name__ == "__main__":
    # draw_mesh_1()
    draw_mesh_2()
    # test_mesh()
    # test_mesh_2()