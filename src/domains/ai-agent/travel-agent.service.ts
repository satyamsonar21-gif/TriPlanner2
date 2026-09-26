import type {
  ChatMessage,
  AgentContext,
  ActionCard,
} from './travel-agent.types';
import { AiOrchestrator } from '@/domains/ai/ai-orchestrator';
import { GeminiDirectBrowserProvider } from '@/domains/ai/providers/direct-browser-provider';
import { env } from '@/config/env';

export class TravelAgentService {
  private static context: AgentContext = {
    activeDestination: 'Goa',
    userPace: 'Balanced',
    userBudget: 40000,
    userStyles: ['Adventure', 'Beaches', 'Food'],
    userDiet: 'Vegetarian',
  };

  private static orchestrator = new AiOrchestrator({
    provider: env.geminiApiKey ? new GeminiDirectBrowserProvider() : undefined
  });

  public static getContext(): AgentContext {
    let originCity = undefined;
    try {
      const stored = localStorage.getItem('triplanner_active_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.origin_city) {
          originCity = parsed.origin_city;
        }
      }
    } catch {}
    return { ...this.context, userOriginCity: originCity };
  }

  public static updateContext(updates: Partial<AgentContext>): AgentContext {
    this.context = { ...this.context, ...updates };
    return { ...this.context };
  }

  /**
   * Generates intelligent, context-aware responses as the Living Journey AI Copilot
   * using the actual AI Orchestrator instead of mocks.
   */
  public static async generateResponse(
    userPrompt: string,
    _history: ChatMessage[] = []
  ): Promise<ChatMessage> {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const ctx = this.getContext();
      const originContext = ctx.userOriginCity 
        ? { 'Origin City': ctx.userOriginCity, 'Budget Instruction': `Manage everything (hotel, travels, ghumna firna) under my budget of ${ctx.userBudget} starting from ${ctx.userOriginCity}` }
        : undefined;

      const response = await this.orchestrator.processRequest({
        operationType: 'traveler_assistant',
        sessionActor: {
          actorId: 'usr_hackathon',
          actorRole: 'traveler',
        },
        userMessage: userPrompt,
        untrustedExternalContext: originContext,
      });

      let content = response.message;
      let actionCard: ActionCard | undefined = undefined;

      if (response.extractedPreferences) {
        if (response.extractedPreferences.pace?.value) {
          const rawPace = response.extractedPreferences.pace.value;
          const mappedPace = rawPace === 'relaxed' ? 'Relaxed' : rawPace === 'fast-paced' ? 'Packed' : 'Balanced';
          this.updateContext({ userPace: mappedPace });
        }
      }

      // Convert Operator Summary into Action Card if present
      if (response.operatorSummary) {
        const desc = response.operatorSummary.communicationDraft ? JSON.stringify(response.operatorSummary.communicationDraft) : `Total tours evaluated: ${response.operatorSummary.totalToursEvaluated}`;
        actionCard = {
          id: `card_${Date.now()}`,
          type: 'itinerary_update',
          title: response.headline || 'System Update',
          subtitle: 'AI Action Completed',
          description: desc,
          actionLabel: 'View Details',
          actionPayload: 'view_details'
        };
      } else if (response.headline && response.headline !== 'TripPlanner AI Companion') {
         actionCard = {
          id: `card_${Date.now()}`,
          type: 'preference_applied',
          title: response.headline,
          subtitle: '',
          description: '',
          actionLabel: 'Acknowledge',
          actionPayload: 'ack'
        };
      }

      return {
        id: `msg_${Date.now()}`,
        sender: 'agent',
        timestamp,
        content: content || 'I have processed your request.',
        actionCard,
        suggestedFollowUps: [
          'Optimize my Goa trip for the weather',
          'What should I pack for Goa?',
          'Find authentic dinner spots near Candolim',
        ],
      };
    } catch (err) {
      console.error('TravelAgentService AI Error:', err);
      return {
        id: `msg_${Date.now()}`,
        sender: 'agent',
        timestamp,
        content: 'I am currently experiencing connectivity issues with my intelligence core. Please try again in a few moments.',
        suggestedFollowUps: [],
      };
    }
  }
}
