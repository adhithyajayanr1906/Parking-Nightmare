/**
 * MetroPark - Client-Side Dijkstra Shortest Path Engine
 * Computes optimal graph routes and traffic-weighted costs directly in the browser.
 */

// Node Coordinates & Human-Readable Labels for Coimbatore Metropolitan Area
const METROPOLITAN_GRAPH = {
  nodes: {
    "N1": { id: "N1", name: "North City Gate (Gandhipuram Hwy)", lat: 11.0200, lng: 76.9600 },
    "N2": { id: "N2", name: "Central District Square (100 Feet Rd)", lat: 11.0250, lng: 76.9580 },
    "N3": { id: "N3", name: "Tech Park Expressway (Avinashi Rd)", lat: 11.0180, lng: 76.9650 },
    "N4": { id: "N4", name: "South Blvd (Race Course Promenade)", lat: 10.9980, lng: 76.9690 },
    "N5": { id: "N5", name: "Central Metro Transit Terminal", lat: 11.0100, lng: 76.9620 },
    "N6": { id: "N6", name: "West End Commercial Promenade", lat: 11.0150, lng: 76.9500 }
  },
  edges: [
    { u: "N1", v: "N2", distance_km: 1.2, speed_kmh: 40, traffic_factor: 1.1, road_name: "Cross Cut Rd" },
    { u: "N1", v: "N3", distance_km: 1.8, speed_kmh: 50, traffic_factor: 1.0, road_name: "Gandhipuram Hwy" },
    { u: "N2", v: "N3", distance_km: 1.5, speed_kmh: 45, traffic_factor: 1.2, road_name: "100 Feet Rd" },
    { u: "N2", v: "N6", distance_km: 2.1, speed_kmh: 40, traffic_factor: 1.0, road_name: "Mettupalayam Rd" },
    { u: "N3", v: "N5", distance_km: 1.4, speed_kmh: 45, traffic_factor: 1.0, road_name: "Tech Expressway" },
    { u: "N5", v: "N4", distance_km: 1.9, speed_kmh: 50, traffic_factor: 1.1, road_name: "Race Course Promenade" },
    { u: "N6", v: "N5", distance_km: 1.6, speed_kmh: 40, traffic_factor: 1.0, road_name: "DB Road Ave" }
  ]
};

// Calculate edge travel cost w(u, v) in minutes
function calculateEdgeWeight(edge) {
  const timeHours = edge.distance_km / edge.speed_kmh;
  const timeMinutes = timeHours * 60;
  return timeMinutes * edge.traffic_factor;
}

// Dijkstra Shortest Path Algorithm: d(v) = min_{u}(d(u) + w(u, v))
function dijkstraShortestPath(startNodeId, targetNodeId) {
  const distances = {};
  const previous = {};
  const unvisited = new Set();

  Object.keys(METROPOLITAN_GRAPH.nodes).forEach(node => {
    distances[node] = Infinity;
    previous[node] = null;
    unvisited.add(node);
  });

  distances[startNodeId] = 0;

  while (unvisited.size > 0) {
    // Select unvisited node with smallest distance
    let current = null;
    let minDistance = Infinity;

    unvisited.forEach(node => {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        current = node;
      }
    });

    if (current === null || current === targetNodeId) break;

    unvisited.delete(current);

    // Find neighbors
    METROPOLITAN_GRAPH.edges.forEach(edge => {
      let neighbor = null;
      if (edge.u === current) neighbor = edge.v;
      else if (edge.v === current) neighbor = edge.u;

      if (neighbor && unvisited.has(neighbor)) {
        const weight = calculateEdgeWeight(edge);
        const alt = distances[current] + weight;

        if (alt < distances[neighbor]) {
          distances[neighbor] = alt;
          previous[neighbor] = current;
        }
      }
    });
  }

  // Reconstruct path
  const path = [];
  let curr = targetNodeId;
  while (curr !== null) {
    path.unshift(curr);
    curr = previous[curr];
  }

  // Compute total travel metrics
  let totalDistanceKm = 0;
  let totalMinutes = distances[targetNodeId];

  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    const edge = METROPOLITAN_GRAPH.edges.find(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
    if (edge) totalDistanceKm += edge.distance_km;
  }

  const co2SavedKg = parseFloat((totalDistanceKm * 0.12).toFixed(2));

  return {
    path,
    start_node: METROPOLITAN_GRAPH.nodes[startNodeId],
    target_node: METROPOLITAN_GRAPH.nodes[targetNodeId],
    total_travel_time_mins: parseFloat(totalMinutes.toFixed(1)),
    total_distance_km: parseFloat(totalDistanceKm.toFixed(1)),
    co2_saved_kg: co2SavedKg
  };
}

// Dynamic Rerouting Engine: Finds next nearest available slot node if target is occupied
function dynamicReroute(originNodeId, occupiedSlotId) {
  const slots = LocalDatabase.getTable("SLOTS");
  const availableSlots = slots.filter(s => s.status === "AVAILABLE" && s.slot_id !== occupiedSlotId);

  if (availableSlots.length === 0) return null;

  let bestRoute = null;
  let minTime = Infinity;
  let selectedSlot = null;

  availableSlots.forEach(slot => {
    const route = dijkstraShortestPath(originNodeId, slot.node_id);
    if (route.total_travel_time_mins < minTime) {
      minTime = route.total_travel_time_mins;
      bestRoute = route;
      selectedSlot = slot;
    }
  });

  return {
    rerouted_slot: selectedSlot,
    route: bestRoute
  };
}
