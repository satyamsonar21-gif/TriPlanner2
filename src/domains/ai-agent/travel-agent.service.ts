import type {
  ChatMessage,
  AgentContext,
  ActionCard,
} from './travel-agent.types';

export class TravelAgentService {
  private static context: AgentContext = {
    activeDestination: 'Goa',
    userPace: 'Balanced',
    userBudget: 40000,
    userStyles: ['Adventure', 'Beaches', 'Food'],
    userDiet: 'Vegetarian',
  };

  public static getContext(): AgentContext {
    return { ...this.context };
  }

  public static updateContext(updates: Partial<AgentContext>): AgentContext {
    this.context = { ...this.context, ...updates };
    return { ...this.context };
  }

  /**
   * Generates intelligent, context-aware responses as the Living Journey AI Copilot.
   */
  public static async generateResponse(
    userPrompt: string,
    _history: ChatMessage[] = []
  ): Promise<ChatMessage> {
    // Simulate natural AI thinking delay (400 - 750ms)
    await new Promise((resolve) => setTimeout(resolve, 550));

    const promptLower = userPrompt.toLowerCase().trim();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Weather & Environmental Query
    if (
      promptLower.includes('weather') ||
      promptLower.includes('rain') ||
      promptLower.includes('tide') ||
      promptLower.includes('swell') ||
      promptLower.includes('climate')
    ) {
      const card: ActionCard = {
        id: `card_${Date.now()}`,
        type: 'weather_alert',
        title: 'Goa Coastal Maritime Telemetry: Active Swell Advisory',
        subtitle: '13 May 2026 • Northern Sandbanks',
        description:
          'High tide and 2.4m swell detected between 14:00 and 17:30. Estuary waters in Mandovi remain calm for morning kayak navigation.',
        actionLabel: 'Shift Kayaking to 09:30 AM',
        actionPayload: 'shift_kayak_morning',
      };

      return {
        id: `msg_${Date.now()}`,
        sender: 'agent',
        timestamp,
        content: `I've pulled the real-time meteorological telemetry for your upcoming **Goa Getaway** (12–16 May):\n\n- **Current Conditions**: 31°C, Partly Cloudy, 78% Humidity with sea breeze.\n- **Advisory**: There is an afternoon high tide and swell alert on 13 May along northern Aguada.\n\n💡 **My Recommendation**: I have pre-calculated an alternative schedule. We can move your **Mandovi Backwater Kayak** to the calm 09:30 AM morning window, and swap the afternoon with a visit to the **Fontainhas Portuguese Heritage Gallery** to avoid open sea currents.`,
        actionCard: card,
        suggestedFollowUps: [
          'Apply the weather adaptation to Day 2',
          'What should I pack for this weather?',
          'Check weather for Rajasthan in June',
        ],
      };
    }

    // 2. Packing & Gear Recommendations
    if (
      promptLower.includes('pack') ||
      promptLower.includes('clothes') ||
      promptLower.includes('luggage') ||
      promptLower.includes('gear')
    ) {
      const card: ActionCard = {
        id: `card_${Date.now()}`,
        type: 'packing_checklist',
        title: 'Smart Packing Checklist: 5-Day Goa Coastal Trip',
        subtitle: 'Optimized for 28°C–33°C tropical climate',
        description:
          'Breathable linens (3x), reef-safe sunscreen (SPF 50), dry-bag for phones, polarized sunglasses, water shoes for rocky tide pools.',
        actionLabel: 'Save Checklist to Passport',
        actionPayload: 'save_packing_list',
      };

      return {
        id: `msg_${Date.now()}`,
        sender: 'agent',
        timestamp,
        content: `Here is your custom packing blueprint tailored for your **5-Day Goa Getaway**:\n\n### 🎒 Apparel & Footwear\n- **3–4 Light Breathable Cottons & Linens**: Ideal for walking tours in 31°C heat.\n- **Swimwear & UV Rashguard**: Essential for Grande Island marine dives.\n- **Comfortable Walking Sandals**: Cushioned soles for cobblestone alleys in Fontainhas.\n- **Water Shoes**: Grip for kayaking launches and rocky tide pools.\n\n### 🛡️ Protection & Gear\n- **Reef-Safe Sunscreen (SPF 50+)** & Polarized Sunglasses.\n- **Waterproof Phone Pouch / 10L Dry-Bag**: Keeps electronics safe during backwater boat transfers.\n- **Compact Umbrella or Light Rain Poncho**: Safeguards against brief afternoon showers.\n\nWould you like me to pin this packing list directly to your Journey Passport?`,
        actionCard: card,
        suggestedFollowUps: [
          'Save Checklist to Passport',
          'What are the best dining spots nearby?',
          'Optimize my transit times',
        ],
      };
    }

    // 3. Preferences Update (Pace, Budget, Diet, Style)
    if (
      promptLower.includes('budget') ||
      promptLower.includes('pace') ||
      promptLower.includes('diet') ||
      promptLower.includes('vegetarian') ||
      promptLower.includes('vegan') ||
      promptLower.includes('prefer')
    ) {
      if (promptLower.includes('vegetarian') || promptLower.includes('diet')) {
        this.updateContext({ userDiet: 'Vegetarian' });
      }
      if (promptLower.includes('relaxed')) {
        this.updateContext({ userPace: 'Relaxed' });
      } else if (promptLower.includes('packed')) {
        this.updateContext({ userPace: 'Packed' });
      }

      const card: ActionCard = {
        id: `card_${Date.now()}`,
        type: 'preference_applied',
        title: 'Traveler Profile Synchronized',
        subtitle: 'Living Journey Engine Rules Updated',
        description: `Active Rules: Pace: ${this.context.userPace} (2 stops/day) • Diet: ${this.context.userDiet} • Budget Cap: ₹${this.context.userBudget.toLocaleString()}`,
        actionLabel: 'View Recalculated Itinerary',
        actionPayload: 'view_recalculated_itinerary',
      };

      return {
        id: `msg_${Date.now()}`,
        sender: 'agent',
        timestamp,
        content: `I've updated your travel preferences and re-calibrated the **Living Journey Engine™**!\n\n- **Travel Pace**: Set to **${this.context.userPace}** (ensuring generous 45-minute buffers between activities).\n- **Dietary Anchor**: Set to **${this.context.userDiet}** (filtering curated tasting menus and verified Goan Saraswat restaurants).\n- **Budget Threshold**: Verified within **₹${this.context.userBudget.toLocaleString()}**.\n\nAll existing and upcoming suggestions will automatically respect these deterministic constraints.`,
        actionCard: card,
        suggestedFollowUps: [
          'Show vegetarian supper clubs in Goa',
          'Optimize Day 2 for relaxed pace',
          'What are the top cultural highlights?',
        ],
      };
    }

    // 4. Disruption & Flight / Delay Handling
    if (
      promptLower.includes('delay') ||
      promptLower.includes('cancel') ||
      promptLower.includes('late') ||
      promptLower.includes('flight') ||
      promptLower.includes('change')
    ) {
      const card: ActionCard = {
        id: `card_${Date.now()}`,
        type: 'itinerary_update',
        title: 'Simulation: 3-Hour Transit Delay',
        subtitle: 'Deterministic DAG Recalculation',
        description:
          'Delayed arrival shifts check-in to 17:30. Fontainhas walking tour auto-shifted to Day 2 morning; private airport transfer delayed without cancellation penalty.',
        actionLabel: 'Preview Graph Adjustment',
        actionPayload: 'preview_delay_shift',
      };

      return {
        id: `msg_${Date.now()}`,
        sender: 'agent',
        timestamp,
        content: `Here is exactly how the **Living Journey Engine** protects your trip during unexpected delays:\n\n1. **Instant Downstream Recalculation**: If your arrival flight is delayed by 3 hours, our dependency graph detects that the 15:00 Fontainhas walking tour violates minimum transit buffers.\n2. **Zero-Penalty Shift**: Your airport chauffeur transfer is automatically rescheduled to your new landing time.\n3. **Intelligent Node Swapping**: The walking tour is shifted to Day 2 morning, replacing idle morning time without compressing your dinner reservations.\n4. **Human-in-the-Loop**: You receive a 1-tap approval card before any modification commits to your master passport.\n\nWould you like me to simulate a flight delay scenario right now?`,
        actionCard: card,
        suggestedFollowUps: [
          'Simulate 3-hour flight delay',
          'Show me my current itinerary graph',
          'What happens if weather cancels a ferry?',
        ],
      };
    }

    // 5. Dining & Local Food
    if (
      promptLower.includes('food') ||
      promptLower.includes('restaurant') ||
      promptLower.includes('eat') ||
      promptLower.includes('dining') ||
      promptLower.includes('cafe')
    ) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'agent',
        timestamp,
        content: `Based on your **${this.context.userDiet}** preferences and **Adventure + Food** style, here are 3 verified culinary jewels in Goa:\n\n1. **Mum’s Kitchen (Panjim)**: Celebrated for preserving authentic Goan ancestral recipes. Excellent vegetarian thali with kokum sol kadhi, pumpkin foogath, and poee bread.\n2. **Café Bodega (Altinho Hill)**: Located inside the Sunaparanta Center for the Arts. Tranquil courtyard cafe serving artisanal coffees, sourdough toasts, and passionfruit tarts.\n3. **Gunpowder (Assagao)**: Coastal South Indian courtyard kitchen under lush canopy. Famous for Malabar parottas, appams with rich vegetable stew, and kokum spritzers.\n\nAll three venues are within 15–20 minutes of your planned stays. Would you like me to reserve a lunch slot on Day 2?`,
        suggestedFollowUps: [
          'Add Mum’s Kitchen to Day 1 lunch',
          'Add Gunpowder to Day 3 dinner',
          'Show me beach sunset shacks',
        ],
      };
    }

    // 6. Generic / Destination Exploration (Rajasthan, Kashmir, Kerala, etc.)
    if (promptLower.includes('rajasthan') || promptLower.includes('jaipur')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'agent',
        timestamp,
        content: `**Rajasthan** is scheduled in your portal for **10–15 June 2026**!\n\n- **Weather Advisory**: Summer temperatures exceed 36°C at midday. I strongly advise scheduling palace visits at **07:30 AM** (Amber Fort sunrise) and reserving afternoons for air-conditioned Haveli museums.\n- **Curated Highlight**: A private starlit dinner on the ramparts of **Nahargarh Fort** overlooking the illuminated Pink City.\n- **Transit Buffer**: Desert highway journeys between Jaipur and Jodhpur require 5 hours with a recommended stepwell lunch stop in Pushkar.\n\nWould you like me to generate a tailored 5-day route map for Rajasthan?`,
        suggestedFollowUps: [
          'Build 5-day Rajasthan route',
          'Check Rajasthan weather and UV',
          'Show boutique palace stays',
        ],
      };
    }

    if (promptLower.includes('kashmir')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'agent',
        timestamp,
        content: `**Kashmir** in May–June offers alpine paradise conditions!\n\n- **Climate**: 19°C crisp mountain sunshine, cooling to 11°C at night.\n- **Signature Experience**: Sunrise wooden shikara market on Dal Lake followed by the Gulmarg Gondola Phase 2 ascent to 3,980m snow line.\n- **Packing**: Fleece layers, windbreaker jacket, and sturdy mountain walking boots.\n\nShall I add Kashmir to your active journey planning queue?`,
        suggestedFollowUps: [
          'Create a Kashmir itinerary draft',
          'Check Gondola ticket availability',
          'Compare budget: Kashmir vs Goa',
        ],
      };
    }

    // 7. Default Assistant Fallback
    return {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      timestamp,
      content: `I'm on it! As your **Living Journey Engine™ Copilot**, I continuously optimize your stays, activities, and transit buffers.\n\nHere is how I can assist right now:\n\n- 🌴 **Trip Optimization**: Re-balance your upcoming **Goa Getaway** (12–16 May) for weather, budget, and pacing.\n- 🌦️ **Environmental Feasibility**: Check real-time tide, weather, and swell advisories for any destination.\n- ⚙️ **Adaptation Simulator**: Test what happens if flights are delayed or activities get rained out.\n- 🎒 **Packing & Logistics**: Generate personalized packing checklists and transit guidance.\n\nWhat would you like to explore next?`,
      suggestedFollowUps: [
        'Optimize my Goa trip for the weather',
        'What should I pack for Goa?',
        'Find authentic dinner spots near Candolim',
        'Update my budget to ₹50,000',
      ],
    };
  }
}
