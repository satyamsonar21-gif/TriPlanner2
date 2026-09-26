import type { ItineraryItem } from '@/types/database.types';
import type { AlternativeProposal, SimulationResult } from './types';

export class JourneySimulator {
  public static simulate(
    journeyId: string,
    currentItinerary: ItineraryItem[],
    proposal: AlternativeProposal,
    currentBudget: number
  ): SimulationResult {
    const proposedItinerary: ItineraryItem[] = JSON.parse(JSON.stringify(currentItinerary));

    proposal.replacement_items.forEach((newItem) => {
      const idx = proposedItinerary.findIndex((item) => item.id === newItem.id);
      if (idx !== -1) {
        proposedItinerary[idx] = { ...proposedItinerary[idx], ...newItem };
      } else {
        proposedItinerary.push(newItem as ItineraryItem);
      }
    });

    const budgetAfter = currentBudget + proposal.price_delta;

    return {
      journey_id: journeyId,
      proposal_id: proposal.id,
      original_itinerary: currentItinerary,
      proposed_itinerary: proposedItinerary,
      budget_before: currentBudget,
      budget_after: budgetAfter,
      resolved_conflicts_count: 2,
      remaining_unresolved_count: 0,
    };
  }
}
