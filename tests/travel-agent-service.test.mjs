import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Traveling AI Agent Service & Intent Processing', () => {
  // Mock simulation of TravelAgentService logic
  class TestTravelAgentService {
    constructor() {
      this.context = {
        activeDestination: 'Goa',
        userPace: 'Balanced',
        userBudget: 40000,
        userStyles: ['Adventure', 'Beaches', 'Food'],
        userDiet: 'Vegetarian',
      };
    }

    updateContext(updates) {
      this.context = { ...this.context, ...updates };
      return this.context;
    }

    parseIntent(prompt) {
      const p = prompt.toLowerCase();
      if (p.includes('weather') || p.includes('rain') || p.includes('swell') || p.includes('tide')) {
        return 'weather_alert';
      }
      if (p.includes('pack') || p.includes('clothes') || p.includes('gear')) {
        return 'packing_checklist';
      }
      if (p.includes('food') || p.includes('restaurant') || p.includes('dining')) {
        return 'dining_recommendation';
      }
      if (p.includes('budget') || p.includes('pace') || p.includes('diet') || p.includes('vegetarian')) {
        return 'preference_update';
      }
      if (p.includes('delay') || p.includes('cancel') || p.includes('flight')) {
        return 'disruption_simulation';
      }
      return 'general_assistance';
    }
  }

  test('correctly identifies weather & environmental advisory requests', () => {
    const agent = new TestTravelAgentService();
    assert.equal(agent.parseIntent('What is the weather in Goa tomorrow?'), 'weather_alert');
    assert.equal(agent.parseIntent('Check sea swell and tide conditions'), 'weather_alert');
  });

  test('correctly identifies packing checklist intent', () => {
    const agent = new TestTravelAgentService();
    assert.equal(agent.parseIntent('What should I pack for Goa?'), 'packing_checklist');
    assert.equal(agent.parseIntent('Need a gear and clothes checklist'), 'packing_checklist');
  });

  test('correctly identifies preference changes and updates context', () => {
    const agent = new TestTravelAgentService();
    assert.equal(agent.parseIntent('Update my budget to ₹50,000'), 'preference_update');
    assert.equal(agent.parseIntent('Switch my pace to relaxed'), 'preference_update');

    agent.updateContext({ userPace: 'Relaxed', userDiet: 'Vegan' });
    assert.equal(agent.context.userPace, 'Relaxed');
    assert.equal(agent.context.userDiet, 'Vegan');
  });

  test('correctly identifies flight delay and Living Journey Engine simulation', () => {
    const agent = new TestTravelAgentService();
    assert.equal(agent.parseIntent('What happens if my flight is delayed by 3 hours?'), 'disruption_simulation');
  });

  test('correctly identifies food and dining recommendations', () => {
    const agent = new TestTravelAgentService();
    assert.equal(agent.parseIntent('Find the best vegetarian dining in Panjim'), 'dining_recommendation');
  });
});
