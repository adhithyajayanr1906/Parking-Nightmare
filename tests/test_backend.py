"""
Metropolitan Parking System (MPS) - Backend Unit Tests
Verifies Dijkstra Navigation Engine, State Machine, Atomic Locking, and API Routes.
Compatible with standard Python unittest or pytest.
"""

import sys
import os
import unittest

# Add backend directory to Python path for test runners and IDE static analysis
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

try:
    # pyrefly: ignore [missing-import]
    from dijkstra_engine import build_default_metropolitan_graph, dijkstra_shortest_path, dynamic_reroute
    # pyrefly: ignore [missing-import]
    from state_manager import SlotStateManager
except ImportError:
    from backend.dijkstra_engine import build_default_metropolitan_graph, dijkstra_shortest_path, dynamic_reroute
    from backend.state_manager import SlotStateManager


class TestMetropolitanBackend(unittest.TestCase):

    def test_dijkstra_shortest_path(self):
        graph = build_default_metropolitan_graph()
        res = dijkstra_shortest_path(graph, "N1", "P1")

        self.assertTrue(res["success"])
        self.assertEqual(res["start_node"], "N1")
        self.assertEqual(res["target_node"], "P1")
        self.assertIn("N2", res["path"])
        self.assertGreater(res["total_distance_m"], 0)
        self.assertGreater(res["estimated_time_min"], 0)
        self.assertGreater(res["carbon_saved_kg"], 0)

    def test_dynamic_reroute(self):
        graph = build_default_metropolitan_graph()
        available_nodes = ["P2", "P3", "P4"]
        res = dynamic_reroute(graph, "N1", "P1", available_nodes)

        self.assertTrue(res["success"])
        self.assertTrue(res["is_rerouted"])
        self.assertEqual(res["rerouted_from"], "P1")
        self.assertIn(res["target_node"], available_nodes)

    def test_state_manager_atomic_reservation(self):
        sm = SlotStateManager(reservation_timeout_seconds=5)
        sm.initialize_slot("TEST-SLOT-1", "AVAILABLE")

        # First reservation should succeed
        res1 = sm.reserve_slot_atomic("TEST-SLOT-1", "DRIVER-A", "BOOK-101")
        self.assertTrue(res1["success"])
        self.assertEqual(res1["status"], "RESERVED")

        # Second reservation on same slot must fail (race condition prevention)
        res2 = sm.reserve_slot_atomic("TEST-SLOT-1", "DRIVER-B", "BOOK-102")
        self.assertFalse(res2["success"])
        self.assertIn("cannot be reserved", res2["error"])

    def test_state_machine_pipeline(self):
        sm = SlotStateManager(reservation_timeout_seconds=300)
        sm.initialize_slot("TEST-SLOT-2", "AVAILABLE")

        # 1. Reserve: AVAILABLE -> RESERVED
        res1 = sm.reserve_slot_atomic("TEST-SLOT-2", "DRIVER-1", "B-001")
        self.assertTrue(res1["success"])

        # 2. Check-in: RESERVED -> OCCUPIED
        res2 = sm.checkin_slot("TEST-SLOT-2", "DRIVER-1")
        self.assertTrue(res2["success"])
        self.assertEqual(res2["status"], "OCCUPIED")

        # 3. Check-out: OCCUPIED -> AVAILABLE
        res3 = sm.checkout_slot("TEST-SLOT-2")
        self.assertTrue(res3["success"])
        self.assertEqual(res3["status"], "AVAILABLE")

    def test_force_release(self):
        sm = SlotStateManager(reservation_timeout_seconds=300)
        sm.initialize_slot("TEST-SLOT-3", "AVAILABLE")
        sm.reserve_slot_atomic("TEST-SLOT-3", "DRIVER-X", "B-999")

        release_res = sm.force_release_slot("TEST-SLOT-3", "Admin Override")
        self.assertTrue(release_res["success"])
        self.assertEqual(release_res["status"], "AVAILABLE")


if __name__ == "__main__":
    unittest.main()
