package com.mps.service;

import org.springframework.stereotype.Service;
import java.util.*;

/**
 * DijkstraRoutingService - Enterprise Java Graph Engine
 * Computes shortest path travel routes and dynamic alternative slot rerouting.
 */
@Service
public class DijkstraRoutingService {

    public static class Node {
        public final String id;
        public Node(String id) { this.id = id; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            Node node = (Node) o;
            return Objects.equals(id, node.id);
        }

        @Override
        public int hashCode() {
            return Objects.hash(id);
        }
    }

    public static class Edge {
        public final Node target;
        public final double weight;
        public Edge(Node target, double weight) {
            this.target = target;
            this.weight = weight;
        }
    }

    public List<Node> findShortestPath(Node source, Node destination, Map<Node, List<Edge>> graph) {
        Map<Node, Double> distances = new HashMap<>();
        Map<Node, Node> previousNodes = new HashMap<>();
        PriorityQueue<Node> queue = new PriorityQueue<>(Comparator.comparing(node -> distances.getOrDefault(node, Double.POSITIVE_INFINITY)));

        distances.put(source, 0.0);
        queue.add(source);

        while (!queue.isEmpty()) {
            Node current = queue.poll();
            if (current.equals(destination)) break;

            for (Edge edge : graph.getOrDefault(current, Collections.emptyList())) {
                double newDist = distances.get(current) + edge.weight;
                if (newDist < distances.getOrDefault(edge.target, Double.POSITIVE_INFINITY)) {
                    distances.put(edge.target, newDist);
                    previousNodes.put(edge.target, current);
                    queue.add(edge.target);
                }
            }
        }

        List<Node> path = new ArrayList<>();
        for (Node at = destination; at != null; at = previousNodes.get(at)) {
            path.add(at);
        }
        Collections.reverse(path);
        return path;
    }

    public List<Node> rerouteToAlternative(Node source, List<Node> alternativeSlots, Map<Node, List<Edge>> graph) {
        Node nearestAlternative = null;
        double shortestDistance = Double.POSITIVE_INFINITY;

        for (Node altSlot : alternativeSlots) {
            List<Node> path = findShortestPath(source, altSlot, graph);
            if (!path.isEmpty()) {
                double pathDist = calculatePathDistance(path, graph);
                if (pathDist < shortestDistance) {
                    shortestDistance = pathDist;
                    nearestAlternative = altSlot;
                }
            }
        }
        return nearestAlternative != null ? findShortestPath(source, nearestAlternative, graph) : Collections.emptyList();
    }

    private double calculatePathDistance(List<Node> path, Map<Node, List<Edge>> graph) {
        double total = 0.0;
        for (int i = 0; i < path.size() - 1; i++) {
            Node u = path.get(i);
            Node v = path.get(i + 1);
            for (Edge e : graph.getOrDefault(u, Collections.emptyList())) {
                if (e.target.equals(v)) { total += e.weight; break; }
            }
        }
        return total;
    }
}
