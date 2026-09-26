export type MessageSender = 'user' | 'agent' | 'system';

export interface ActionCard {
  id: string;
  type: 'itinerary_update' | 'weather_alert' | 'destination_card' | 'packing_checklist' | 'preference_applied';
  title: string;
  subtitle?: string;
  description: string;
  data?: Record<string, unknown>;
  actionLabel?: string;
  actionPayload?: string;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: string;
  actionCard?: ActionCard;
  suggestedFollowUps?: string[];
}

export interface AgentContext {
  activeDestination?: string;
  userPace: 'Relaxed' | 'Balanced' | 'Packed';
  userBudget: number;
  userStyles: string[];
  userDiet: string;
}
