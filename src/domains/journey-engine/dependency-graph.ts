import type {
  ItineraryItem,
  ItineraryDependency,
  DisruptionSeverity,
} from '@/types/database.types';
import type {
  DependencyNode,
  DependencyEdge,
  JourneySnapshot,
  JourneySnapshotItem,
} from './types';

export interface GraphConflict {
  itemId: string;
  conflictingWithId: string;
  type:
    | 'overlap'
    | 'buffer_breach'
    | 'predecessor_cancelled'
    | 'missing_prerequisite';
  severity: DisruptionSeverity;
  deficitMinutes: number;
  description: string;
}

export interface GraphValidationIssue {
  code:
    | 'ORPHAN_DEPENDENCY_EDGE'
    | 'DUPLICATE_DEPENDENCY_EDGE'
    | 'SELF_DEPENDENCY_EDGE'
    | 'CIRCULAR_DEPENDENCY_CYCLE';
  edgeId?: string;
  fromItemId?: string;
  toItemId?: string;
  cyclePath?: string[];
  message: string;
}

export interface GraphValidationResult {
  isValid: boolean;
  cycles: string[][];
  conflicts: GraphConflict[];
  structuralIssues: GraphValidationIssue[];
  errors: string[];
}

/**
 * Adjacency-Indexed Directed Dependency Graph for the Living Journey Engine™.
 * Supports both legacy (ItineraryItem + ItineraryDependency) and Phase 04
 * (JourneySnapshotItem + DependencyEdge) inputs with O(V + E) indexed traversals.
 */
export class DependencyGraph {
  private itemsMap: Map<string, ItineraryItem> = new Map();
  private snapshotItemsMap: Map<string, JourneySnapshotItem> = new Map();
  private dependencies: ItineraryDependency[] = [];
  private normalizedEdges: DependencyEdge[] = [];

  // O(1) Adjacency Indexes
  private outgoingAdj: Map<string, string[]> = new Map();
  private incomingAdj: Map<string, string[]> = new Map();
  private edgeByPair: Map<string, DependencyEdge> = new Map();

  constructor(
    items: Array<ItineraryItem | JourneySnapshotItem> = [],
    dependencies: Array<ItineraryDependency | DependencyEdge> = []
  ) {
    items.forEach((raw) => {
      if ('startTimeIso' in raw) {
        const snapItem = raw as JourneySnapshotItem;
        this.snapshotItemsMap.set(snapItem.id, snapItem);
        this.itemsMap.set(snapItem.id, {
          id: snapItem.id,
          journey_id: snapItem.journeyId,
          day_id: `day_${snapItem.dayNumber}`,
          sequence_order: snapItem.sequenceOrder,
          item_type:
            snapItem.type === 'accommodation'
              ? 'accommodation'
              : snapItem.type === 'transport' ||
                snapItem.type === 'flight' ||
                snapItem.type === 'transfer'
              ? 'transport'
              : 'activity',
          title: snapItem.title,
          description: snapItem.subtitle,
          start_time: snapItem.startTimeIso,
          end_time: snapItem.endTimeIso,
          location_name: snapItem.location.name,
          geo_lat: snapItem.location.latitude,
          geo_lng: snapItem.location.longitude,
          price: snapItem.price,
          currency: snapItem.currency,
          booking_id: snapItem.bookingId,
          booking_state: snapItem.bookingState,
          is_locked: snapItem.isLocked,
          party_size: snapItem.partySize,
          category_tags: snapItem.categoryTags,
          status: snapItem.status,
        });
      } else {
        const legacyItem = raw as ItineraryItem;
        this.itemsMap.set(legacyItem.id, legacyItem);
      }
      this.outgoingAdj.set(raw.id, []);
      this.incomingAdj.set(raw.id, []);
    });

    dependencies.forEach((dep, index) => {
      if ('fromItemId' in dep) {
        const edge = dep as DependencyEdge;
        this.normalizedEdges.push(edge);
        this.dependencies.push({
          id: edge.id,
          journey_id: edge.journeyId,
          preceding_item_id: edge.fromItemId,
          dependent_item_id: edge.toItemId,
          min_buffer_minutes: edge.minBufferMinutes,
          dependency_type: 'time_buffer',
        });
      } else {
        const legacyDep = dep as ItineraryDependency;
        this.dependencies.push(legacyDep);
        this.normalizedEdges.push({
          id: legacyDep.id || `edge_${index + 1}`,
          journeyId: legacyDep.journey_id || 'jrn_default',
          fromItemId: legacyDep.preceding_item_id,
          toItemId: legacyDep.dependent_item_id,
          type: 'PRECEDES',
          minBufferMinutes: legacyDep.min_buffer_minutes ?? 15,
          isHardConstraint: true,
        });
      }
    });

    // Populate adjacency lists
    this.normalizedEdges.forEach((edge) => {
      const fromId = edge.fromItemId;
      const toId = edge.toItemId;
      if (this.outgoingAdj.has(fromId)) {
        const list = this.outgoingAdj.get(fromId)!;
        if (!list.includes(toId)) {
          list.push(toId);
        }
      }
      if (this.incomingAdj.has(toId)) {
        const list = this.incomingAdj.get(toId)!;
        if (!list.includes(fromId)) {
          list.push(fromId);
        }
      }
      const pairKey = `${fromId}->${toId}`;
      if (!this.edgeByPair.has(pairKey)) {
        this.edgeByPair.set(pairKey, edge);
      }
    });
  }

  public static fromSnapshot(snapshot: JourneySnapshot): DependencyGraph {
    return new DependencyGraph(snapshot.items, snapshot.dependencies);
  }

  /**
   * Returns immediate direct dependent item IDs of `itemId`.
   */
  public getDirectDependents(itemId: string): string[] {
    return [...(this.outgoingAdj.get(itemId) || [])];
  }

  /**
   * Returns immediate direct prerequisite item IDs of `itemId`.
   */
  public getDirectPrerequisites(itemId: string): string[] {
    return [...(this.incomingAdj.get(itemId) || [])];
  }

  /**
   * Returns all transitive downstream node IDs reachable from `itemId`
   * (excluding `itemId` itself unless `includeSelf` is true).
   */
  public getDownstreamNodes(itemId: string, includeSelf = false): string[] {
    if (!this.itemsMap.has(itemId)) {
      return [];
    }
    const visited = new Set<string>();
    const result: string[] = [];
    const queue: string[] = [itemId];
    visited.add(itemId);

    if (includeSelf) {
      result.push(itemId);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.outgoingAdj.get(current) || [];
      for (const nextId of neighbors) {
        if (!visited.has(nextId) && this.itemsMap.has(nextId)) {
          visited.add(nextId);
          result.push(nextId);
          queue.push(nextId);
        }
      }
    }

    return result;
  }

  /**
   * Returns all transitive upstream node IDs that `itemId` depends on.
   */
  public getUpstreamNodes(itemId: string, includeSelf = false): string[] {
    if (!this.itemsMap.has(itemId)) {
      return [];
    }
    const visited = new Set<string>();
    const result: string[] = [];
    const queue: string[] = [itemId];
    visited.add(itemId);

    if (includeSelf) {
      result.push(itemId);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const parents = this.incomingAdj.get(current) || [];
      for (const parentId of parents) {
        if (!visited.has(parentId) && this.itemsMap.has(parentId)) {
          visited.add(parentId);
          result.push(parentId);
          queue.push(parentId);
        }
      }
    }

    return result;
  }

  /**
   * Returns true if `toItemId` depends directly or transitively on `fromItemId`.
   */
  public hasDependency(fromItemId: string, toItemId: string): boolean {
    if (fromItemId === toItemId) return false;
    const downstream = this.getDownstreamNodes(fromItemId, false);
    return downstream.includes(toItemId);
  }

  /**
   * Returns the shortest directed path `[fromItemId, ..., toItemId]` using BFS,
   * or `[]` if no path exists.
   */
  public getDependencyPath(fromItemId: string, toItemId: string): string[] {
    if (
      !this.itemsMap.has(fromItemId) ||
      !this.itemsMap.has(toItemId)
    ) {
      return [];
    }
    if (fromItemId === toItemId) {
      return [fromItemId];
    }

    const visited = new Set<string>([fromItemId]);
    const parentMap = new Map<string, string>();
    const queue: string[] = [fromItemId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.outgoingAdj.get(current) || [];
      for (const nextId of neighbors) {
        if (!this.itemsMap.has(nextId)) continue;
        if (!visited.has(nextId)) {
          visited.add(nextId);
          parentMap.set(nextId, current);
          if (nextId === toItemId) {
            // Reconstruct path
            const path: string[] = [toItemId];
            let cursor: string | undefined = toItemId;
            while (cursor && cursor !== fromItemId) {
              const p = parentMap.get(cursor);
              if (!p) break;
              path.unshift(p);
              cursor = p;
            }
            return path;
          }
          queue.push(nextId);
        }
      }
    }

    return [];
  }

  /**
   * Legacy helper: Traverse downstream items that transitively depend on rootItemId (including rootItemId).
   */
  public getDownstreamItems(rootItemId: string): ItineraryItem[] {
    const nodeIds = this.getDownstreamNodes(rootItemId, true);
    return nodeIds
      .map((id) => this.itemsMap.get(id))
      .filter((item): item is ItineraryItem => item !== undefined);
  }

  /**
   * Returns the dependency edge configuration between two items if one exists.
   */
  public getEdge(fromItemId: string, toItemId: string): DependencyEdge | undefined {
    return this.edgeByPair.get(`${fromItemId}->${toItemId}`);
  }

  /**
   * Validates structural integrity of edges (orphan references, duplicates, self-dependencies, cycles).
   */
  public validateStructuralIssues(): GraphValidationIssue[] {
    const issues: GraphValidationIssue[] = [];
    const seenPairs = new Set<string>();

    this.normalizedEdges.forEach((edge) => {
      if (edge.fromItemId === edge.toItemId) {
        issues.push({
          code: 'SELF_DEPENDENCY_EDGE',
          edgeId: edge.id,
          fromItemId: edge.fromItemId,
          toItemId: edge.toItemId,
          message: `Self-dependency detected on item "${edge.fromItemId}".`,
        });
      }

      if (
        !this.itemsMap.has(edge.fromItemId) ||
        !this.itemsMap.has(edge.toItemId)
      ) {
        issues.push({
          code: 'ORPHAN_DEPENDENCY_EDGE',
          edgeId: edge.id,
          fromItemId: edge.fromItemId,
          toItemId: edge.toItemId,
          message: `Dependency edge "${edge.id}" references missing node(s): ${edge.fromItemId} -> ${edge.toItemId}.`,
        });
      }

      const pairKey = `${edge.fromItemId}->${edge.toItemId}`;
      if (seenPairs.has(pairKey)) {
        issues.push({
          code: 'DUPLICATE_DEPENDENCY_EDGE',
          edgeId: edge.id,
          fromItemId: edge.fromItemId,
          toItemId: edge.toItemId,
          message: `Duplicate dependency edge between "${edge.fromItemId}" and "${edge.toItemId}".`,
        });
      } else {
        seenPairs.add(pairKey);
      }
    });

    const cycles = this.detectCycles();
    cycles.forEach((cycle) => {
      issues.push({
        code: 'CIRCULAR_DEPENDENCY_CYCLE',
        cyclePath: cycle,
        message: `Circular dependency detected: ${cycle.join(' -> ')}.`,
      });
    });

    return issues;
  }

  /**
   * Cycle Detection algorithm for Directed Graph using DFS color classification
   * (0 = unvisited, 1 = visiting/recursion-stack, 2 = fully visited)
   */
  public detectCycles(): string[][] {
    const state = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
    const cycles: string[][] = [];

    const dfs = (u: string, currentPath: string[]) => {
      state.set(u, 1);
      currentPath.push(u);

      const neighbors = this.outgoingAdj.get(u) || [];
      for (const v of neighbors) {
        if (!this.itemsMap.has(v)) continue;
        if (state.get(v) === 1) {
          const cycleStartIndex = currentPath.indexOf(v);
          if (cycleStartIndex !== -1) {
            cycles.push([...currentPath.slice(cycleStartIndex), v]);
          }
        } else if (!state.get(v)) {
          dfs(v, currentPath);
        }
      }

      currentPath.pop();
      state.set(u, 2);
    };

    this.itemsMap.forEach((_, id) => {
      if (!state.get(id)) {
        dfs(id, []);
      }
    });

    return cycles;
  }

  public hasCycle(): boolean {
    return this.detectCycles().length > 0;
  }

  /**
   * Topological sort of itinerary items according to dependencies
   */
  public topologicalSort(): ItineraryItem[] {
    if (this.hasCycle()) {
      throw new Error(
        'Cannot perform topological sort on dependency graph containing cycles.'
      );
    }

    const inDegree = new Map<string, number>();
    this.itemsMap.forEach((_, id) => {
      inDegree.set(id, 0);
    });

    this.outgoingAdj.forEach((neighbors, fromId) => {
      if (!this.itemsMap.has(fromId)) return;
      neighbors.forEach((toId) => {
        if (this.itemsMap.has(toId)) {
          inDegree.set(toId, (inDegree.get(toId) || 0) + 1);
        }
      });
    });

    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    const sortedOrder: ItineraryItem[] = [];

    while (queue.length > 0) {
      const u = queue.shift()!;
      const item = this.itemsMap.get(u);
      if (item) sortedOrder.push(item);

      const neighbors = this.outgoingAdj.get(u) || [];
      for (const v of neighbors) {
        if (!this.itemsMap.has(v)) continue;
        const nextDeg = (inDegree.get(v) || 1) - 1;
        inDegree.set(v, nextDeg);
        if (nextDeg === 0) queue.push(v);
      }
    }

    return sortedOrder;
  }

  /**
   * Detect real scheduling, buffer erosion, and cancellation conflicts
   */
  public detectConflicts(): GraphConflict[] {
    const conflicts: GraphConflict[] = [];

    this.normalizedEdges.forEach((edge) => {
      const parent = this.itemsMap.get(edge.fromItemId);
      const child = this.itemsMap.get(edge.toItemId);

      if (!parent || !child) {
        conflicts.push({
          itemId: edge.toItemId,
          conflictingWithId: edge.fromItemId,
          type: 'missing_prerequisite',
          severity: 'critical',
          deficitMinutes: 0,
          description: `Prerequisite item ${edge.fromItemId} is missing from the active itinerary.`,
        });
        return;
      }

      if (parent.status === 'cancelled' || parent.status === 'disrupted') {
        conflicts.push({
          itemId: child.id,
          conflictingWithId: parent.id,
          type: 'predecessor_cancelled',
          severity: 'critical',
          deficitMinutes: 0,
          description: `Upstream activity "${parent.title}" is ${parent.status}, breaking requirement for "${child.title}".`,
        });
        return;
      }

      const parentEnd = new Date(parent.end_time).getTime();
      const childStart = new Date(child.start_time).getTime();

      if (isNaN(parentEnd) || isNaN(childStart)) {
        return;
      }

      const availableBufferMinutes = Math.round(
        (childStart - parentEnd) / (1000 * 60)
      );
      const requiredBufferMinutes = edge.minBufferMinutes || 0;
      const deficitMinutes = requiredBufferMinutes - availableBufferMinutes;

      if (availableBufferMinutes < 0) {
        conflicts.push({
          itemId: child.id,
          conflictingWithId: parent.id,
          type: 'overlap',
          severity: 'critical',
          deficitMinutes: Math.abs(availableBufferMinutes),
          description: `Schedule conflict: "${child.title}" starts ${Math.abs(
            availableBufferMinutes
          )} mins before "${parent.title}" concludes.`,
        });
      } else if (deficitMinutes > 0) {
        const severity: DisruptionSeverity =
          deficitMinutes >= 45 || child.item_type === 'transport'
            ? 'high'
            : 'medium';

        conflicts.push({
          itemId: child.id,
          conflictingWithId: parent.id,
          type: 'buffer_breach',
          severity,
          deficitMinutes,
          description: `Transit buffer eroded by ${deficitMinutes} mins between "${parent.title}" and "${child.title}".`,
        });
      }
    });

    return conflicts;
  }

  /**
   * Complete validation of graph integrity
   */
  public validateGraph(): GraphValidationResult {
    const cycles = this.detectCycles();
    const conflicts = this.detectConflicts();
    const structuralIssues = this.validateStructuralIssues();
    const errors: string[] = [];

    structuralIssues.forEach((issue) => {
      errors.push(issue.message);
    });

    conflicts.forEach((c) => {
      errors.push(c.description);
    });

    return {
      isValid:
        cycles.length === 0 &&
        conflicts.length === 0 &&
        structuralIssues.length === 0,
      cycles,
      conflicts,
      structuralIssues,
      errors,
    };
  }

  public buildGraph(): Map<string, DependencyNode> {
    const nodes = new Map<string, DependencyNode>();

    this.itemsMap.forEach((item, id) => {
      nodes.set(id, {
        itemId: id,
        item,
        dependents: [],
        prerequisites: [],
        bufferMinutes: 0,
      });
    });

    this.normalizedEdges.forEach((edge) => {
      const parent = nodes.get(edge.fromItemId);
      const child = nodes.get(edge.toItemId);

      if (parent && child) {
        parent.dependents.push(child);
        child.prerequisites.push(parent);
        child.bufferMinutes = edge.minBufferMinutes;
      }
    });

    return nodes;
  }
}
