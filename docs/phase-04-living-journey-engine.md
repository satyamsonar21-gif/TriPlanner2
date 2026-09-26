# Phase 04 — Living Journey Engine™ Architecture & Production Specification

## 1. Executive Overview
The **Living Journey Engine™** (`src/domains/journey-engine/`) is the deterministic operational intelligence core of **Triplanner**. Unlike static itinerary planners or unstructured chatbot recommendations, the Living Journey Engine models every trip as a versioned, constraint-aware directed dependency graph (`JourneySnapshot`) and executes a deterministic 14-stage lifecycle:

`PLAN → BOOK → MONITOR → DETECT → UNDERSTAND → IMPACT → ALTERNATIVES → SIMULATE → APPROVE → APPLY → PROPAGATE → NOTIFY → AUDIT → CONTINUE`

---

## 2. Core Design Principles
1. **100% Determinism**: Identical `JourneySnapshot` and `ChangeTriggerInput` inputs always produce identical dependency traversals, constraint violations, candidate filtering, multi-factor scores, and simulation diffs.
2. **Coherent Snapshot Isolation (`JourneySnapshot`)**: Every engine stage operates on a deep-cloned, self-contained `JourneySnapshot` containing the journey metadata, optimistic concurrency `version`, traveler preferences, ordered items, locations, travel modes, dependency edges, booking states, capacities, and budget allocations.
3. **Simulation Immutability**: `JourneySimulator.simulateAlternative()` never mutates live journey state or database records.
4. **Filter Before Rank**: Invalid candidates (`UNAVAILABLE`, `UNKNOWN` availability, insufficient capacity, outside opening hours, or violating hard budget/transfer buffer constraints) are strictly rejected by `ConstraintEngine` before `AlternativeEngine` scores and ranks valid options.
5. **Atomic Execution & Optimistic Concurrency**: Applying a change requires matching `expectedJourneyVersion`, re-runs full constraint validation immediately before commit, increments `version` (`v17 → v18`), and rolls back completely if any mid-transaction failure occurs.

---

## 3. Domain Module Topology (`src/domains/journey-engine/`)

| File | Responsibility |
| :--- | :--- |
| [`types.ts`](file:///e:/pillai%20hackthon/src/domains/journey-engine/types.ts) | Canonical TypeScript interfaces for `JourneySnapshot`, `DependencyEdge`, `ImpactDimension`, `ConstraintViolation`, `CandidateActivity`, `ScoredAlternative`, `SimulationDiff`, `EngineChangeRequest`, `ChangePlan`, `ChangeSet`, `DomainOutboxEvent`, and Phase 05/06 contracts. |
| [`dependency-graph.ts`](file:///e:/pillai%20hackthon/src/domains/journey-engine/dependency-graph.ts) | $O(V + E)$ adjacency-indexed directed dependency graph with `getDirectDependents`, `getDownstreamNodes`, `getUpstreamNodes`, `hasDependency`, `getDependencyPath`, cycle detection, and structural validation (orphans, duplicates, self-dependencies). |
| [`constraint-engine.ts`](file:///e:/pillai%20hackthon/src/domains/journey-engine/constraint-engine.ts) | Evaluates 11 constraint categories (`TEMPORAL`, `SPATIAL`, `TRANSFER_BUFFER`, `SEQUENCE`, `BOOKING_STATE`, `AVAILABILITY`, `CAPACITY`, `BUDGET`, `TRAVELER_PREFERENCE`, `RESOURCE`, `DEPENDENCY`). |
| [`impact-analyzer.ts`](file:///e:/pillai%20hackthon/src/domains/journey-engine/impact-analyzer.ts) | Evaluates all 10 impact dimensions (`DIRECT`, `DOWNSTREAM`, `TEMPORAL`, `SPATIAL`, `BOOKING`, `BUDGET`, `CAPACITY`, `TRAVELER`, `OPERATIONAL`, `NOTIFICATION`) and classifies severity (`NONE`, `INFO`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). |
| [`alternative-engine.ts`](file:///e:/pillai%20hackthon/src/domains/journey-engine/alternative-engine.ts) | Candidate inventory catalog, constraint-based candidate filter, configurable 6-factor scorer (`0–100`), and structured factual explanation generator. |
| [`simulator.ts`](file:///e:/pillai%20hackthon/src/domains/journey-engine/simulator.ts) | Pure before/after simulator computing item-by-item schedule changes, downstream shifts, cost/budget deltas, route distance deltas, and resolved vs remaining conflicts. |
| [`living-journey-engine.ts`](file:///e:/pillai%20hackthon/src/domains/journey-engine/living-journey-engine.ts) | Stateful orchestrator enforcing the 12-state `ChangeRequest` machine, idempotency registry, RBAC authorization, optimistic concurrency, pre-apply revalidation, atomic rollback, audit logging, and transactional outbox emission. |

---

## 4. Dependency Graph Model & Validation Rules
Supported `DependencyEdgeType` relationships:
- `PRECEDES`
- `REQUIRES_COMPLETION_OF`
- `TRANSFERS_TO`
- `REQUIRES_CHECKIN_AT`
- `REQUIRES_CHECKOUT_BEFORE`
- `SHARES_BOOKING_WITH`
- `SAME_VENDOR_AS`
- `WITHIN_DAY_WINDOW`

Structural validation (`validateStructuralIssues()`) rejects:
- `SELF_DEPENDENCY_EDGE` (`fromItemId === toItemId`)
- `ORPHAN_DEPENDENCY_EDGE` (missing `fromItemId` or `toItemId` in snapshot)
- `DUPLICATE_DEPENDENCY_EDGE` (duplicate directed edge pair)
- `CIRCULAR_DEPENDENCY_CYCLE` (2-node or multi-node cycle detected via 3-color DFS)

---

## 5. 10-Dimension Impact Analysis & 6-Level Severity Semantics
Every change trigger produces a `DimensionImpact` across all 10 dimensions:
1. `DIRECT`: Immediate effect on the target itinerary stop.
2. `DOWNSTREAM`: Transitive cascade across dependent stops (`getDownstreamNodes`).
3. `TEMPORAL`: Time overlaps, vacated windows, or buffer compression.
4. `SPATIAL`: Route corridor distance and transit duration changes.
5. `BOOKING`: Voucher cancellation, credit release, or lock status.
6. `BUDGET`: Released funds, net cost delta, and hard/soft cap compliance.
7. `CAPACITY`: Party size vs activity capacity verification.
8. `TRAVELER`: Alignment with traveler pace and style preferences.
9. `OPERATIONAL`: Coordinator/operator voucher reallocation requirements.
10. `NOTIFICATION`: Stakeholder alert routing (`traveler`, `operator`).

---

## 6. Explainable Multi-Factor Scoring Formula (`0–100`)
Valid candidates that pass all hard constraints in `ConstraintEngine` are scored deterministically using configurable weights (`DEFAULT_SCORING_WEIGHTS`):

| Factor | Max Points | Deterministic Rule |
| :--- | :--- | :--- |
| **Preference Match** | `30` | Tag & category overlap with `snapshot.travelStyles` (`+27/30` for multi-tag + primary category match). |
| **Time Window Fit** | `20` | Alignment with vacated slot and operating hours (`+18/20` for $\le 30\text{m}$ shift). |
| **Location Proximity** | `15` | Road distance to the next stop (`+14/15` for $\le 3.0\text{ km}$). |
| **Budget Fit** | `15` | Cost savings vs disrupted item while delivering curated value (`+15/15` for net savings). |
| **Dependency Compatibility** | `10` | Preserves downstream locked bookings (`+9/10` when evening Dinner remains untouched). |
| **Availability Confidence** | `10` | `AVAILABLE` = `+10/10`, `LIMITED` = `+7/10` (`UNAVAILABLE` and `UNKNOWN` are rejected before ranking). |

---

## 7. 12-State ChangeRequest Lifecycle
`DRAFT → ANALYZING → ALTERNATIVES_READY → AWAITING_APPROVAL → APPROVED → APPLYING → APPLIED`
Terminal / branch states: `REJECTED`, `EXPIRED`, `FAILED`, `CANCELLED`, `SUPERSEDED`.

---

## 8. Database Schema & Atomic RPC (`20260926000003_phase04_living_journey_engine.sql`)
- Extends `public.journeys` with `version INT NOT NULL DEFAULT 1`, `allocated_cost`, `hard_budget_constraint`, and `soft_budget_tolerance_pct`.
- Creates normalized tables: `public.change_requests`, `public.change_impacts`, `public.alternative_options`, `public.change_plans`, `public.domain_outbox_events`, and `public.idempotency_keys` with strict `CHECK` constraints, indexes, and RLS policies.
- Provides `public.apply_journey_change_atomic(...)` (`SECURITY DEFINER`, `SET search_path = public`) which locks the journey row `FOR UPDATE`, checks idempotency, verifies `version = p_expected_version`, applies item mutations, increments `version`, supersedes stale requests, writes immutable audit logs, and emits outbox events in a single PostgreSQL transaction.

---

## 9. Phase 05 (AI Boundary) & Phase 06 (Event Boundary) Contracts
- **Phase 05 (`Phase05AiBoundaryContract`)**: AI services may summarize `ImpactAnalysisResult` or refine natural-language copy on already-validated `ScoredAlternative[]`, but AI **never** bypasses `ConstraintEngine` or mutates database state directly.
- **Phase 06 (`Phase06EventBoundaryContract`)**: External flight, weather, traffic, and vendor webhooks normalize into `ChangeTriggerInput` with a deterministic `idempotencyKey` (`ext_<externalEventId>`) and enter `LivingJourneyEngine.detectAndAnalyzeChange()`.
