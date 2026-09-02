# METROPOLITAN PARKING SYSTEM (MPS)
## Enterprise Architecture & Investor Pitch Deck Specification

---

### 1. Executive Product Overview & Investor Pitch Deck

#### Product Overview
Metropolitan Parking System (MPS) is a two-sided mobility marketplace monetizing unused private parking assets (residential driveways, private garages, commercial lots). Through spatial search and graph-optimized routing, MPS connects drivers directly with private space owners in real time.

#### Problem Statement
- **Cruising Congestion**: Urban drivers spend 17–38 hours annually searching for available parking spots.
- **30% Cruising Traffic**: 30% of traffic in city business districts is strictly drivers looking for parking space.
- **Environmental Impact**: Wasted fuel, increased carbon emissions, and severe road bottlenecks.
- **Unused Assets**: Private residential driveways and garages sit empty during peak working hours.

#### The MPS Solution
- **For Drivers**: Real-time map search, spatial filters, Dijkstra shortest path navigation, dynamic automatic rerouting, and 15-minute guaranteed slot locks.
- **For Space Owners**: Easy space listing, dynamic hourly pricing, live occupancy tracker, and automated digital earnings payouts.
- **For Admins**: Complete operations dashboard, listing auditing, lock override safety, and platform revenue management.

#### Business & Revenue Model
- **15% to 20% Platform Commission**: Charged on each completed parking reservation transaction.
- **Flat Convenience Booking Fee**: Charged per reservation booking.
- **Dynamic Surge Pricing**: Peak-demand pricing during regional events and high-density business hours.

#### Unit Economics Formula
$$\text{Net Revenue} = (\text{Hourly Rate} \times \text{Hours} \times \text{Commission \%}) + \text{Booking Fee} - \text{Processing Cost}$$

---

### 2. Full-Stack Enterprise System Architecture

```
                                  [ REACT 18+ SPA ]
                                          │
                                 (STOMP / WebSocket)
                                          │
                             ┌────────────┴────────────┐
                             ▼                         ▼
                 [ SPRING BOOT 3.x API ]     [ REDIS DISTRIBUTED LOCK ]
                             │               (Redisson Atomic Slot Lock)
                ┌────────────┴────────────┐
                ▼                         ▼
   [ DIJKSTRA ROUTING ENGINE ]  [ POSTGRESQL + POSTGIS SPATIAL DB ]
    d(v) = min_{u}(d(u)+w(u,v))      (ST_DWithin Spatial Index)
```

#### Tech Stack
- **Backend**: Java 17/21, Spring Boot 3.x, Spring Security (JWT), Spring Data JPA, WebSocket (STOMP/SockJS), Redis (Redisson distributed locks), Python Flask API option.
- **Frontend**: React 18+, TypeScript, Vite, Tailwind CSS, Leaflet.js / OSRM API, TanStack Query, Standalone Vanilla JS option.
- **Database**: PostgreSQL 15+ with PostGIS 3.3 extension enabled (`ST_DWithin`, GiST spatial indexing), SQLite fallback.
- **In-Memory Cache & Locking**: Redis 7.0 (Redisson distributed locks) to prevent race conditions and enforce non-blocking atomic slot locks.
- **DevOps**: Docker multi-stage builds and `docker-compose.yml` multi-container deployment.

---

### 3. Core Modules & Role-Based Access Control (RBAC)

1. **Driver Module (`ROLE_DRIVER`)**:
   - Profile creation, vehicle registration (plate number, vehicle type: Car/Bike).
   - Spatial proximity search using PostGIS within search radius.
   - Graph-based routing (Dijkstra) from origin $S$ to target slot node $D$:
     $$d(v) = \min_{u \in N} (d(u) + w(u, v))$$
   - Dynamic alternative slot rerouting if target slot state changes to `OCCUPIED`.
   - 15-minute slot reservation hold, mock payment gateway integration, and digital receipts.

2. **Space Renting Owner Module (`ROLE_OWNER`)**:
   - Listing management (location coordinates, capacities, rates, vehicle support).
   - Scheduling operating windows and availability toggles.
   - Real-time slot occupancy dashboard (`AVAILABLE` $\rightarrow$ `RESERVED` $\rightarrow$ `OCCUPIED` $\rightarrow$ `AVAILABLE`).
   - Earnings ledger and direct IMPS withdrawal log.

3. **Admin Control Module (`ROLE_ADMIN`)**:
   - Executive operations dashboard (drivers, owners, slots, total revenue, active bookings).
   - Account/Listing auditing and identity document verification queue.
   - Manual override tools for expired reservations, force slot lock release, and dispute resolution.
   - Financial analytics, 15-20% commission tracking, and carbon reduction metrics.

---

### 4. Academic Project Metadata & Credits

- **Institution**: Sri Eshwar College of Engineering, Coimbatore, Tamil Nadu
- **Department**: Computer Science and Engineering (CSE)
- **Team Name / Batch**: IDEATORS / Batch 12
- **Faculty Mentor**: AdhithyaJayan R

#### Team Members:
1. **AdhithyaJayan R** (`25CS003`) - Research & Analysis Lead
2. **Akshai T** (`25CS006`) - Solution & Design Lead
3. **Dayanand K** (`25CS027`) - Technical Lead

#### Estimated Prototype Budget (₹2,500 Total):
- Cloud Hosting & Server Deployment: ₹500
- Domain Name & SSL Registry: ₹500
- Maps & Location API Credits: ₹500
- Database & Cloud Storage Instance: ₹500
- UI/UX & Prototype Assets: ₹500
- Testing & Miscellaneous: ₹500

#### UN Sustainable Development Goals (SDGs):
- **SDG 11**: Sustainable Cities & Communities (Reduces urban traffic searching & CO₂ emissions).
- **SDG 12**: Responsible Consumption & Production (Monetizes existing urban land assets without new construction).
