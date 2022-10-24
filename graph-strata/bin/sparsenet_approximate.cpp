#include <iostream>
#include <fstream>
#include <vector>
#include <algorithm>
#include <list>
#include <functional>
#include <map>
#include <set>
#include <cmath>
#include<time.h>


using namespace std;


int bfs1(vector<vector<int>> &adj, int s);
vector<int> bfs2(vector<vector<int>> &adj, int s);  //find the longest path
vector<vector<int>> getwaves(vector<vector<int>> &adj, vector<vector<int>> &landmark); // find all landmarks by bfs on all the landmarks each time
vector<vector<int>> getwaves2(vector<vector<int>>& adj, vector<vector<int>>& landmark, vector<int>& dist, bool *islandmark, int *parent, bool* visited);


void mapFromVector(map<int, vector<int>>& m, vector<vector<int> >& v);

int main(int argc, char** argv) {
	ifstream in(argv[1]);
	string outname = (*(new string(argv[1]))).append(".out");
	ofstream out(outname);
	int a, b;
	int root = 0;
	vector<vector<int>> adj;
	while (in >> a >> b) {
		if (adj.size() <= max(a, b)) {
			adj.resize(max(a, b) + 1);
		}
		adj[a].push_back(b);
		adj[b].push_back(a);
	}
	in.close();
	int vCount = adj.size();
	cout << "vertex count is " << vCount;
	if (vCount == 0) { cout << "cannot process empty graph " << endl; return 0; }

	if (vCount < 3) { cout << "cannot process tiny graph with " << vCount << "vertices" << endl; return 0; }

	clock_t start_time = clock();
	vector<vector<int>> landmark;

	cout << "using approximate sparse net" << endl;

	int u = bfs1(adj, a);
	vector<int> longest = bfs2(adj, u);

	landmark.push_back(longest);

	vector<int> dist(vCount);
	bool *isLandmark = new bool[vCount];
	int *parent = new int[vCount];
	bool *visited = new bool[vCount];

	//landmark = getwaves(adj, landmark);
	for (int i = 0; i < adj.size(); i++)
		visited[i] = false;
	for (int i = 0; i < adj.size(); i++)
		dist[i] = -1;
	landmark = getwaves2(adj, landmark, dist, isLandmark, parent, visited);
	delete isLandmark; delete parent; delete visited;



	clock_t end_time = clock();
	cout << (double)(end_time - start_time) / CLOCKS_PER_SEC << "s" << endl;

	for (int i = 0; i < landmark.size(); i++) {
		for (int j = 0; j < landmark[i].size(); j++) {
			out << landmark[i][j] << " ";

		}
		out << endl;
	}
	out.close();
	return 0;
}

int bfs1(vector<vector<int>>& adj, int s) {
	list<int> queue;
	bool *visited = new bool[adj.size()];
	for (int i = 0; i < adj.size(); i++)
		visited[i] = false;
	queue.push_back(s);
	visited[s] = true;
	vector<int>::iterator i;
	int temp = 0;
	while (!queue.empty()) {
		s = queue.front();
		temp = s;
		queue.pop_front();
		for (i = adj[s].begin(); i != adj[s].end(); i++) {
			if (!visited[*i]) {
				visited[*i] = true;
				queue.push_back(*i);
			}
		}
	}
	return temp;
}

vector<int> bfs2(vector<vector<int>>& adj, int s) {
	list<int> queue;
	bool *visited = new bool[adj.size()];
	int *parent = new int[adj.size()];
	for (int i = 0; i < adj.size(); i++)
		visited[i] = false;
	queue.push_back(s);
	visited[s] = true;
	parent[s] = -1;
	vector<int>::iterator i;
	int temp = 0;
	while (!queue.empty()) {
		s = queue.front();
		temp = s;
		queue.pop_front();
		for (i = adj[s].begin(); i != adj[s].end(); i++) {
			if (!visited[*i]) {
				visited[*i] = true;
				queue.push_back(*i);
				parent[*i] = s;
			}
		}
	}

	vector<int> res;
	while (parent[temp] != -1) {
		res.push_back(temp);
		temp = parent[temp];
	}
	res.push_back(temp);
	return res;
}

vector<vector<int>> getwaves(vector<vector<int>>& adj, vector<vector<int>>& landmark) {
	int farthest = -1;
	int cur, temp;
	list<int> queue;
	int *parent = new int[adj.size()];
	int *dist = new int[adj.size()];
	for (int i = 0; i < adj.size(); i++)
		dist[i] = -1;
	for (int i = 0; i < landmark.size(); i++) {
		for (int j = 0; j < landmark[i].size(); j++) {
			parent[landmark[i][j]] = -1;
			queue.push_back(landmark[i][j]);
			dist[landmark[i][j]] = 0;
		}
	}
	vector<int>::iterator i;
	bool flag = true;
	while (!queue.empty() && flag) {
		cur = queue.front();
		temp = cur;
		queue.pop_front();
		for (i = adj[cur].begin(); i != adj[cur].end(); i++) {
			if (dist[*i] == -1) {
				dist[*i] = dist[cur] + 1;
				queue.push_back(*i);
				parent[*i] = cur;
			}
			else {
				dist[*i] = min(dist[*i], dist[cur] + 1);

				if (dist[*i] == landmark[landmark.size() - 1].size()) {
					flag = false;
					break;
				}

			}
			farthest = max(farthest, dist[*i]);
		}
	}
	if (farthest > 1) {
		vector<int> newlandmark;
		while (parent[temp] != -1) {
			newlandmark.push_back(temp);
			temp = parent[temp];
		}
		newlandmark.push_back(temp);
		landmark.push_back(newlandmark);
		landmark = getwaves(adj, landmark);
	}
	return landmark;
}

vector<vector<int>>  getwaves2(vector<vector<int>>& adj, vector<vector<int>>& landmark, vector<int>& dist, bool *islandmark, int *parent, bool* visited) {
	list<int> queue;
	//bool *visited = new bool[adj.size()];
	//for (int i = 0; i < adj.size(); i++) { visited[i] = false; }
	typedef std::function<bool(pair<int, int>, pair<int, int>)> Comparator;//"function" is also defined in Boost
	Comparator compFunctor = [](pair<int, int> elem1, pair<int, int> elem2) {
		return elem1.second > elem2.second;
	};

	int maxdist = adj.size();
	do {
		for (int i = 0; i < landmark[landmark.size() - 1].size(); i++) {
			int lm = landmark[landmark.size() - 1][i];
			visited[lm] = true;
			parent[lm] = -1;
			queue.push_back(lm);
			dist[lm] = 0;
			islandmark[lm] = true;
		}

		int cur, temp;
		vector<int>::iterator i;
		while (!queue.empty()) {
			cur = queue.front();
			temp = cur;
			queue.pop_front();
			for (i = adj[cur].begin(); i != adj[cur].end(); i++) {
				if (dist[*i] == -1) {
					dist[*i] = dist[cur] + 1;
					queue.push_back(*i);
					parent[*i] = cur;
					visited[*i] = true;
				}
				else {
					//if (!visited[*i]) {
					if (dist[*i] > dist[cur] + 1) {
						dist[*i] = dist[cur] + 1;
						parent[*i] = cur;
						visited[*i] = true;
						queue.push_back(*i);
					}

				}
			}
		}
		std::vector<int>::iterator result;

		result = std::max_element(dist.begin(), dist.end());
		temp = std::distance(dist.begin(), result);
		maxdist = *result;
		if (maxdist > 1) {
			vector<int> newlandmark;
			while (parent[temp] != -1) {
				newlandmark.push_back(temp);
				temp = parent[temp];
			}
			newlandmark.push_back(temp);
			landmark.push_back(newlandmark);
			//limit SN paths number?
			if (landmark.size() > log(adj.size())*log(adj.size()))return landmark;
			/*for (int i = 0; i < newlandmark.size(); i++) {
				cout << newlandmark[i]<<" ";
			}
			cout << endl;*/
		}
		else {
			return landmark;
		}
	} while (maxdist > 1);


}



void mapFromVector(map<int, vector<int>>& m, vector<vector<int> >& v)
{
	for (int i = 0; i < v.size(); i++) {
		vector<int>& v2 = v[i];
		auto it = m.insert(make_pair(i, vector<int>())).first;
		//get meta edges
		for (int entry : v2)
		{
			it->second.push_back(entry);
		}
	}
}
