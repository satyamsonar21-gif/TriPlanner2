import type { ItineraryItem, ItineraryDependency } from '@/types/database.types';
import type { DisruptionEvent, ImpactReport } from './types';
import { DependencyGraph } from './dependency-graph';

export class ImpactAnalyzer {
  public static analyze(
    disruption: DisruptionEvent,
    itineraryItems: ItineraryItem[],
    dependencies: ItineraryDependency[]
  ): ImpactReport {
    const graph = new DependencyGraph(itineraryItems, dependencies);
    const affectedItems = graph.getDownstreamItems(disruption.affected_item_id);
    const cascadingIds = affectedItems.map((item) => item.id);

    const impactDetails: ImpactReport['impact_details'] = [];
    let hasCritical = false;

    affectedItems.forEach((item) => {
      if (item.id === disruption.affected_item_id) {
        impactDetails.push({
          item_id: item.id,
          item_title: item.title,
          type: 'time_overlap',
          severity: 'high',
          explanation: `Primary disruption detected: ${disruption.description}`,
        });
        hasCritical = true;
      } else {
        impactDetails.push({
          item_id: item.id,
          item_title: item.title,
          type: 'missed_connection',
          severity: 'medium',
          explanation: `Dependent sequence constraint breached due to upstream delay in ${disruption.affected_item_id}.`,
        });
      }
    });

    return {
      change_request_id: `cr_${Date.now()}`,
      journey_id: disruption.journey_id,
      disruption,
      affected_items_count: affectedItems.length,
      cascading_item_ids: cascadingIds,
      has_critical_conflict: hasCritical,
      impact_details: impactDetails,
    };
  }
}
