import type { ItineraryItem, ItineraryDependency } from '@/types/database.types';
import type { DependencyNode } from './types';

export class DependencyGraph {
  private itemsMap: Map<string, ItineraryItem> = new Map();
  private dependencies: ItineraryDependency[] = [];

  constructor(items: ItineraryItem[], dependencies: ItineraryDependency[]) {
    items.forEach((item) => this.itemsMap.set(item.id, item));
    this.dependencies = dependencies;
  }

  public getDownstreamItems(rootItemId: string): ItineraryItem[] {
    const affectedSet = new Set<string>();
    const queue: string[] = [rootItemId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (!affectedSet.has(currentId)) {
        affectedSet.add(currentId);

        const childDeps = this.dependencies.filter(
          (dep) => dep.preceding_item_id === currentId
        );

        childDeps.forEach((dep) => {
          if (!affectedSet.has(dep.dependent_item_id)) {
            queue.push(dep.dependent_item_id);
          }
        });
      }
    }

    return Array.from(affectedSet)
      .map((id) => this.itemsMap.get(id))
      .filter((item): item is ItineraryItem => item !== undefined);
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

    this.dependencies.forEach((dep) => {
      const parent = nodes.get(dep.preceding_item_id);
      const child = nodes.get(dep.dependent_item_id);

      if (parent && child) {
        parent.dependents.push(child);
        child.prerequisites.push(parent);
        child.bufferMinutes = dep.min_buffer_minutes;
      }
    });

    return nodes;
  }
}
