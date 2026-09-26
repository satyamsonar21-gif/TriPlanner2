import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Pure JS simulation test for DependencyGraph & Conflict Detection logic
class DependencyGraphTestEngine {
  constructor(items = [], dependencies = []) {
    this.items = new Map();
    this.edges = new Map(); // from preceding to dependent
    this.incomingEdges = new Map();
    this.edgeConfigs = new Map();

    items.forEach((item) => this.addItem(item));
    dependencies.forEach((dep) => this.addDependency(dep));
  }

  addItem(item) {
    this.items.set(item.id, item);
    if (!this.edges.has(item.id)) this.edges.set(item.id, []);
    if (!this.incomingEdges.has(item.id)) this.incomingEdges.set(item.id, []);
  }

  addDependency(dep) {
    const fromId = dep.preceding_item_id;
    const toId = dep.dependent_item_id;

    if (!this.edges.has(fromId)) this.edges.set(fromId, []);
    if (!this.incomingEdges.has(toId)) this.incomingEdges.set(toId, []);

    this.edges.get(fromId).push(toId);
    this.incomingEdges.get(toId).push(fromId);

    const edgeKey = `${fromId}->${toId}`;
    this.edgeConfigs.set(edgeKey, dep);
  }

  detectCycles() {
    const visited = new Map();
    const cycles = [];
    const currentPath = [];

    for (const [nodeId] of this.items) {
      visited.set(nodeId, 0); // 0 = unvisited
    }

    const dfs = (nodeId) => {
      visited.set(nodeId, 1); // 1 = visiting
      currentPath.push(nodeId);

      const neighbors = this.edges.get(nodeId) || [];
      for (const neighbor of neighbors) {
        const state = visited.get(neighbor);
        if (state === 1) {
          const cycleStartIdx = currentPath.indexOf(neighbor);
          const cycle = currentPath.slice(cycleStartIdx).concat(neighbor);
          cycles.push(cycle);
        } else if (state === 0) {
          dfs(neighbor);
        }
      }

      currentPath.pop();
      visited.set(nodeId, 2); // 2 = visited
    };

    for (const [nodeId] of this.items) {
      if (visited.get(nodeId) === 0) {
        dfs(nodeId);
      }
    }

    return cycles;
  }

  hasCycle() {
    return this.detectCycles().length > 0;
  }

  topologicalSort() {
    if (this.hasCycle()) {
      return null;
    }

    const inDegree = new Map();
    for (const [nodeId] of this.items) {
      inDegree.set(nodeId, 0);
    }
    for (const [, neighbors] of this.edges) {
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
      }
    }

    const queue = [];
    for (const [nodeId, deg] of inDegree) {
      if (deg === 0) queue.push(nodeId);
    }

    const sorted = [];
    while (queue.length > 0) {
      const current = queue.shift();
      sorted.push(current);

      const neighbors = this.edges.get(current) || [];
      for (const neighbor of neighbors) {
        const newDeg = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) {
          queue.push(neighbor);
        }
      }
    }

    return sorted;
  }

  detectConflicts() {
    const conflicts = [];

    for (const [edgeKey, dep] of this.edgeConfigs) {
      const parent = this.items.get(dep.preceding_item_id);
      const child = this.items.get(dep.dependent_item_id);

      if (!parent || !child) continue;

      const parentEnd = new Date(parent.end_time).getTime();
      const childStart = new Date(child.start_time).getTime();

      const availableBufferMinutes = (childStart - parentEnd) / (1000 * 60);
      const minRequiredMinutes = dep.min_buffer_minutes || 0;
      const deficitMinutes = minRequiredMinutes - availableBufferMinutes;

      if (availableBufferMinutes < 0) {
        conflicts.push({
          itemId: child.id,
          conflictingWithId: parent.id,
          type: 'overlap',
          severity: 'critical',
          deficitMinutes: Math.abs(availableBufferMinutes),
        });
      } else if (deficitMinutes > 0) {
        conflicts.push({
          itemId: child.id,
          conflictingWithId: parent.id,
          type: 'buffer_breach',
          severity: deficitMinutes >= 45 ? 'high' : 'medium',
          deficitMinutes,
        });
      }
    }

    return conflicts;
  }
}

describe('Journey Engine — DAG & Conflict Analysis', () => {
  test('DAG cycle detection identifies valid acyclic graphs', () => {
    const items = [
      { id: '1', title: 'Arrival Flight' },
      { id: '2', title: 'Airport Transfer' },
      { id: '3', title: 'Hotel Check-in' },
    ];
    const deps = [
      { preceding_item_id: '1', dependent_item_id: '2', min_buffer_minutes: 30 },
      { preceding_item_id: '2', dependent_item_id: '3', min_buffer_minutes: 15 },
    ];

    const engine = new DependencyGraphTestEngine(items, deps);
    assert.strictEqual(engine.hasCycle(), false);
    assert.deepStrictEqual(engine.detectCycles(), []);

    const order = engine.topologicalSort();
    assert.deepStrictEqual(order, ['1', '2', '3']);
  });

  test('DAG cycle detection catches circular dependencies', () => {
    const items = [
      { id: 'A', title: 'Stop A' },
      { id: 'B', title: 'Stop B' },
      { id: 'C', title: 'Stop C' },
    ];
    const deps = [
      { preceding_item_id: 'A', dependent_item_id: 'B' },
      { preceding_item_id: 'B', dependent_item_id: 'C' },
      { preceding_item_id: 'C', dependent_item_id: 'A' }, // circular!
    ];

    const engine = new DependencyGraphTestEngine(items, deps);
    assert.strictEqual(engine.hasCycle(), true);
    assert.strictEqual(engine.topologicalSort(), null);
    const cycles = engine.detectCycles();
    assert.strictEqual(cycles.length > 0, true);
  });

  test('Conflict detection catches negative buffer / schedule overlaps', () => {
    const items = [
      {
        id: 'flight',
        title: 'Delayed Flight',
        start_time: '2026-05-12T10:00:00Z',
        end_time: '2026-05-12T12:00:00Z',
      },
      {
        id: 'transfer',
        title: 'Airport Transfer',
        start_time: '2026-05-12T11:30:00Z', // Starts 30 mins BEFORE flight arrives!
        end_time: '2026-05-12T12:30:00Z',
      },
    ];
    const deps = [
      { preceding_item_id: 'flight', dependent_item_id: 'transfer', min_buffer_minutes: 30 },
    ];

    const engine = new DependencyGraphTestEngine(items, deps);
    const conflicts = engine.detectConflicts();

    assert.strictEqual(conflicts.length, 1);
    assert.strictEqual(conflicts[0].type, 'overlap');
    assert.strictEqual(conflicts[0].severity, 'critical');
    assert.strictEqual(conflicts[0].deficitMinutes, 30);
  });

  test('Conflict detection catches insufficient buffer breaches', () => {
    const items = [
      {
        id: 'flight',
        title: 'Flight',
        start_time: '2026-05-12T10:00:00Z',
        end_time: '2026-05-12T12:00:00Z',
      },
      {
        id: 'transfer',
        title: 'Airport Transfer',
        start_time: '2026-05-12T12:10:00Z', // 10 mins buffer, but 45 required
        end_time: '2026-05-12T13:00:00Z',
      },
    ];
    const deps = [
      { preceding_item_id: 'flight', dependent_item_id: 'transfer', min_buffer_minutes: 45 },
    ];

    const engine = new DependencyGraphTestEngine(items, deps);
    const conflicts = engine.detectConflicts();

    assert.strictEqual(conflicts.length, 1);
    assert.strictEqual(conflicts[0].type, 'buffer_breach');
    assert.strictEqual(conflicts[0].deficitMinutes, 35);
  });

  test('Simulator structuredClone preserves data isolation without reference leakage', () => {
    const originalItinerary = {
      journey_id: 'jrn_test_01',
      items: [
        { id: 'item_1', title: 'Original Sightseeing', price: 1000 },
        { id: 'item_2', title: 'Beach Dinner', price: 2500 },
      ],
    };

    const simulatedClone = structuredClone(originalItinerary);
    simulatedClone.items[0].title = 'Alternative Indoor Museum';
    simulatedClone.items[0].price = 800;

    // Mutating simulatedClone MUST NOT mutate original
    assert.strictEqual(originalItinerary.items[0].title, 'Original Sightseeing');
    assert.strictEqual(originalItinerary.items[0].price, 1000);
    assert.strictEqual(simulatedClone.items[0].title, 'Alternative Indoor Museum');
    assert.strictEqual(simulatedClone.items[0].price, 800);
  });
});
