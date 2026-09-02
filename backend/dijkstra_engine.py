"""
Metropolitan Parking System (MPS) - Dijkstra Navigation & Dynamic Rerouting Engine
Implements Dijkstra's Shortest Path Algorithm for urban road graphs:
    d(v) = min_{u in N} (d(u) + w(u, v))

Calculates distance, travel time, dynamic rerouting to next nearest slot,
and estimates environmental carbon offset savings (kg CO2).
"""

import heapq
import math

class UrbanGraph:
    def __init__(self):
        # Nodes: dict of node_id -> {"name": str, "lat": float, "lng": float, "type": "intersection" | "parking"}
        self.nodes = {}
        # Adjacency list: dict of node_id -> list of (neighbor_id, distance_m, speed_limit_kmh, traffic_factor)
        self.edges = {}

    def add_node(self, node_id, name, lat, lng, node_type="intersection"):
        self.nodes[node_id] = {
            "id": node_id,
            "name": name,
            "lat": lat,
            "lng": lng,
            "type": node_type
        }
        if node_id not in self.edges:
            self.edges[node_id] = []

    def add_edge(self, u, v, distance_m, speed_limit_kmh=30, traffic_factor=1.0):
        # Weight w(u, v) = travel time in seconds = (distance / speed) * traffic_factor
        speed_m_per_sec = (speed_limit_kmh * 1000.0) / 3600.0
        base_time_sec = distance_m / speed_m_per_sec
        weight = base_time_sec * traffic_factor

        self.edges[u].append({
            "neighbor": v,
            "distance_m": distance_m,
            "speed_kmh": speed_limit_kmh,
            "traffic_factor": traffic_factor,
            "weight": weight
        })

def build_default_metropolitan_graph():
    """Builds a realistic 12-node urban road network for Metropolitan Parking System."""
    graph = UrbanGraph()

    # Define Urban Nodes (Intersections & Parking Destinations)
    nodes_data = [
        ("N1", "North Junction / City Gate", 11.0168, 76.9558, "intersection"),
        ("N2", "Central Square Intersection", 11.0185, 76.9612, "intersection"),
        ("N3", "Tech Park Avenue", 11.0210, 76.9675, "intersection"),
        ("N4", "South Boulevard Cross", 11.0125, 76.9590, "intersection"),
        ("N5", "Metro Central Station", 11.0145, 76.9640, "intersection"),
        ("N6", "Commercial District West", 11.0190, 76.9530, "intersection"),
        # Parking Destination Nodes
        ("P1", "Green Plaza Driveway (Listing #1)", 11.0205, 76.9630, "parking"),
        ("P2", "Metropolitan Tower Garage (Listing #2)", 11.0225, 76.9680, "parking"),
        ("P3", "Heritage Open Lot (Listing #3)", 11.0135, 76.9610, "parking"),
        ("P4", "Grand Arcade Basement (Listing #4)", 11.0175, 76.9545, "parking"),
        ("P5", "EcoPark Dedicated Space (Listing #5)", 11.0240, 76.9590, "parking"),
        ("P6", "Skyline Heights Garage (Listing #6)", 11.0110, 76.9660, "parking")
    ]

    for nid, name, lat, lng, ntype in nodes_data:
        graph.add_node(nid, name, lat, lng, ntype)

    # Bi-directional Road Edges (u, v, distance in meters, speed limit km/h, traffic multiplier)
    roads = [
        ("N1", "N2", 650, 40, 1.1),
        ("N1", "N6", 500, 35, 1.0),
        ("N2", "N3", 800, 45, 1.3),
        ("N2", "P1", 350, 30, 1.0),
        ("N3", "P2", 250, 25, 1.0),
        ("N3", "P5", 900, 40, 1.2),
        ("N1", "P5", 850, 35, 1.0),
        ("N6", "P4", 300, 25, 1.0),
        ("N2", "N5", 550, 35, 1.2),
        ("N4", "N5", 600, 40, 1.1),
        ("N4", "P6", 450, 30, 1.0),
        ("N5", "P3", 300, 25, 1.0),
        ("N5", "P6", 500, 35, 1.1),
        ("P1", "N3", 400, 30, 1.0),
        ("P4", "N2", 500, 35, 1.1),
    ]

    for u, v, dist, speed, traffic in roads:
        graph.add_edge(u, v, dist, speed, traffic)
        graph.add_edge(v, u, dist, speed, traffic)

    return graph


def dijkstra_shortest_path(graph, start_node, target_node):
    """
    Computes shortest path from start_node to target_node using Dijkstra's algorithm.
    Formula: d(v) = min_{u in N} (d(u) + w(u, v))
    Returns path nodes, total distance (m), total travel time (min), and carbon offset (kg CO2).
    """
    if start_node not in graph.nodes or target_node not in graph.nodes:
        return {"error": f"Invalid start node '{start_node}' or target node '{target_node}'"}

    distances = {node: float('inf') for node in graph.nodes}
    distances[start_node] = 0.0

    previous_nodes = {node: None for node in graph.nodes}
    distance_m_map = {node: 0.0 for node in graph.nodes}

    # Priority queue storing tuples: (current_cost, current_node)
    pq = [(0.0, start_node)]

    while pq:
        current_weight, u = heapq.heappop(pq)

        if current_weight > distances[u]:
            continue

        if u == target_node:
            break

        for edge in graph.edges.get(u, []):
            v = edge["neighbor"]
            w = edge["weight"]
            dist_m = edge["distance_m"]

            new_dist = distances[u] + w
            if new_dist < distances[v]:
                distances[v] = new_dist
                previous_nodes[v] = u
                distance_m_map[v] = distance_m_map[u] + dist_m
                heapq.heappush(pq, (new_dist, v))

    if distances[target_node] == float('inf'):
        return {"error": f"No path exists between {start_node} and {target_node}"}

    # Reconstruct path
    path = []
    curr = target_node
    while curr is not None:
        path.append(curr)
        curr = previous_nodes[curr]
    path.reverse()

    total_weight_sec = distances[target_node]
    total_dist_m = distance_m_map[target_node]
    total_time_min = round(total_weight_sec / 60.0, 2)

    # Estimate Carbon Offset (kg CO2) saved vs cruising around for 15 mins (avg 3.5 km cruising = 0.42 kg CO2)
    # Savings formula: Cruising distance eliminated * 0.12 kg CO2 / km
    cruising_eliminated_km = max(0.5, 3.5 - (total_dist_m / 1000.0))
    carbon_saved_kg = round(cruising_eliminated_km * 0.12, 3)

    path_details = [graph.nodes[n] for n in path]

    return {
        "success": True,
        "start_node": start_node,
        "target_node": target_node,
        "path": path,
        "path_nodes": path_details,
        "total_distance_m": round(total_dist_m, 1),
        "total_distance_km": round(total_dist_m / 1000.0, 2),
        "estimated_time_min": total_time_min,
        "carbon_saved_kg": carbon_saved_kg,
        "formula": "d(v) = min_{u in N} (d(u) + w(u, v))"
    }


def dynamic_reroute(graph, start_node, failed_target_node, available_parking_nodes):
    """
    Dynamic Rerouting Engine: Triggered when a reserved target slot becomes unavailable or occupied.
    Calculates shortest paths to all alternative available parking nodes and automatically selects
    the optimal destination.
    """
    valid_candidates = [p for p in available_parking_nodes if p != failed_target_node]
    if not valid_candidates:
        return {"error": "No alternative available parking slots found in graph network"}

    best_route = None
    best_time = float('inf')

    for cand_node in valid_candidates:
        route = dijkstra_shortest_path(graph, start_node, cand_node)
        if route.get("success") and route["estimated_time_min"] < best_time:
            best_time = route["estimated_time_min"]
            best_route = route

    if not best_route:
        return {"error": "Failed to compute dynamic reroute to alternative slots"}

    best_route["rerouted_from"] = failed_target_node
    best_route["is_rerouted"] = True
    return best_route
