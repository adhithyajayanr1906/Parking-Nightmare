# Metropolitan Parking System (MPS) 🅿️🚗
> **An Enterprise-Grade, Community-Driven Urban Mobility Platform for Private Space Monetization & Dynamic Graph-Based Parking Routing**

---

## 📌 Executive Summary & Academic Project Metadata

The **Metropolitan Parking System (MPS)** is an intelligent urban mobility and parking discovery ecosystem designed to resolve urban traffic congestion, lower vehicle idling fuel consumption, and monetize underutilized private parking infrastructure (residential driveways, private garages, commercial lots).

MPS provides dual deployment flexibility:
1. **Pure Client-Side Standalone Mode**: 100% browser-executable SPA with embedded local database, Dijkstra engine, 15-minute timer worker, and MetroAI assistant. Zero backend setup required!
2. **Full-Stack Enterprise Architecture**: Spring Boot 3.x Java backend, Redisson distributed locks, PostgreSQL + PostGIS spatial indexing, and Docker multi-container deployment.

### 🎓 Academic Context
* **Academic Institution**: Sri Eshwar College of Engineering, Coimbatore, Tamil Nadu
* **Department**: Computer Science and Engineering (CSE)
* **Team Name / Batch**: IDEATORS / Batch 12
* **Faculty Mentor**: AdhithyaJayan R

### 👥 Team Members & Responsibilities
| Name | Roll Number | Project Role | Primary Contribution |
| :--- | :--- | :--- | :--- |
| **AdhithyaJayan R** | `25CS003` | **Research & Analysis Lead** | Urban Graph formulation, SDG carbon offset metrics & requirement specification |
| **Akshai T** | `25CS006` | **Solution & Design Lead** | Glassmorphic 3-Panel Dashboard UX/UI architecture & component layout |
| **Dayanand K** | `25CS027` | **Technical Lead** | RESTful Backend API, Dijkstra Engine, Redisson distributed state machine & PostGIS DDL |

---

## 🎯 UN Sustainable Development Goals (SDGs) & Investor Metrics

### UN SDG Alignment
1. **SDG 11: Sustainable Cities & Communities** 🏙️
   - Minimizes vehicle traffic congestion by eliminating "parking cruising" (which accounts for 30% of urban traffic).
   - Reduces urban $CO_2$ emissions by up to **0.42 kg $CO_2$ per driver trip** using optimized graph routing.
2. **SDG 12: Responsible Consumption & Production** ♻️
   - Maximizes efficiency of existing urban land resources by allowing private property owners to list and monetize unused driveways and garages without constructing new parking concrete structures.

### 💼 Business & Revenue Model
- **15% to 20% Platform Commission**: Charged on each completed parking reservation transaction.
- **Unit Economics Formula**:
  $$\text{Net Revenue} = (\text{Hourly Rate} \times \text{Hours} \times \text{Commission \%}) + \text{Booking Fee} - \text{Processing Cost}$$

---

## 🏗️ System Architecture & State Machine

```mermaid
graph TD
    subgraph Frontend Single Page Application
        DP[Driver Workspace]
        OP[Space Owner Portal]
        AP[Admin Control Center]
        AI[MetroAI Assistant Agent]
    end

    subgraph Backend RESTful API & Microservices
        API[Spring Boot / Flask Gateway]
        DE[Dijkstra Navigation Engine]
        RL[Redis Redisson Distributed Lock]
        TW[15-min Countdown State Worker]
    end

    subgraph Spatial Database Layer
        DB[(PostgreSQL + PostGIS / SQLite DB)]
    end

    DP -->|Route Request & Slot Booking| API
    OP -->|Listing Reg & Payout Request| API
    AP -->|Metrics & Force Lock Release| API

    API -->|Graph Computation d(v)| DE
    API -->|Atomic Non-Blocking Lock| RL
    RL <-->|Daemon Poll| TW
    API <-->|Spatial ST_DWithin Queries| DB
```

### 🔐 Slot State Lifecycle Pipeline & Atomic Locks
```
   [AVAILABLE] ──(Driver Reservation)──> [RESERVED] ──(Driver Check-In)──> [OCCUPIED]
        ▲                                    │                                  │
        │                                    │ (15-min Timeout /                │ (Check-Out)
        │                                    │  Admin Override)                 │
        └────────────────────────────────────┴──────────────────────────────────┘
```

---

## 🧮 Dijkstra Navigation Engine & Dynamic Rerouting

Dijkstra's Shortest Path Algorithm calculates travel time and routing from driver origin node $S$ to target parking slot destination node $D$ using weighted edge graph cost:

$$d(v) = \min_{u \in N} (d(u) + w(u, v))$$

Where edge weight $w(u, v)$ incorporates distance, speed limit, and real-time traffic density multiplier:

$$w(u, v) = \left( \frac{\text{distance}(u, v)}{\text{speed}(u, v)} \right) \times \text{traffic\_factor}(u, v)$$

---

## 📂 Repository Structure

```
Parking Nightmare/
├── backend/
│   ├── app.py                     # Python Flask API Gateway & Endpoints
│   ├── Dockerfile                 # Backend Container Build
│   └── src/main/java/com/mps/service/
│       ├── SlotLockService.java   # Redisson Distributed Lock Implementation
│       └── DijkstraRoutingService.java # Java Spring Boot Graph Engine
├── database/
│   ├── schema.sql                 # Relational SQLite DDL Schema
│   └── postgis_schema.sql         # PostgreSQL PostGIS Spatial DDL Schema
├── frontend/
│   ├── index.html                 # Single Page Application Dashboard Entry Point
│   ├── css/
│   │   └── styles.css             # Glassmorphic Dark-Mode CSS Design System
│   └── js/
│       ├── db_mock.js             # Client-Side Persistent Database & State
│       ├── dijkstra.js            # Standalone Client-Side Dijkstra Engine
│       ├── state_manager.js       # Client-Side 15-min Countdown Timer Worker
│       ├── app.js                 # Authentication & Role Router
│       ├── driver.js              # Driver Workspace & Leaflet OSRM Engine
│       ├── owner.js               # Space Owner Portal & Visual Slot Grid
│       ├── admin.js               # Admin Control Center & System Logs
│       └── ai_agent.js            # MetroAI Mobility Assistant Widget
├── docker-compose.yml             # Multi-Container Orchestration (Postgres, Redis, App)
├── ENTERPRISE_SPECIFICATION.md    # Master Architecture Specification & Pitch Deck
└── README.md                      # Comprehensive Documentation
```

---

## 💰 Budget Breakdown (₹2,500 Total Allocation)

| Expense Item | Allocated Budget | Purpose & Deliverable |
| :--- | :--- | :--- |
| **Cloud Hosting & Server** | ₹500 | Production server deployment & SSL cert |
| **Domain & DNS Services** | ₹500 | Project domain registry (`metropark.org`) |
| **Maps & Location API** | ₹500 | OpenStreetMap / Leaflet / Mapbox API credits |
| **Cloud Database Instance** | ₹500 | Managed PostgreSQL/PostGIS database instance |
| **UI/UX Assets & Icons** | ₹500 | SVG vector assets, custom fonts & styling assets |
| **Testing & Miscellaneous** | ₹500 | Automated load testing tools & student domain registration |
| **TOTAL PROJECT BUDGET** | **₹2,500** | **100% Fully Managed Allocation** |

---

## 🚀 Execution Guide

### Option 1: Standalone Web Application (100% Client-Side)
Open `frontend/index.html` directly in any browser or launch a local web server:
```powershell
python -m http.server 8000 --directory frontend
```
Navigate to `http://localhost:8000`.

### Option 2: Docker Multi-Container Enterprise Stack
Launch the full PostgreSQL PostGIS, Redis, Java/Python Backend, and Nginx stack:
```powershell
docker-compose up --build
```

---

*Developed by Team IDEATORS (Batch 12) for Sri Eshwar College of Engineering, Department of CSE.*
