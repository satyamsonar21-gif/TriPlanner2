import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  AlertTriangle,
  CheckCircle2,
  Shirt,
  Sliders,
  RefreshCw,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { TravelAgentService } from '@/domains/ai-agent/travel-agent.service';
import type { ChatMessage, AgentContext, ActionCard } from '@/domains/ai-agent/travel-agent.types';
import { useAuth } from '@/core/auth/AuthContext';

interface TravelAgentChatboxProps {
  className?: string;
  initialDestination?: string;
}

export const TravelAgentChatbox: React.FC<TravelAgentChatboxProps> = ({
  className = '',
  initialDestination = 'Goa',
}) => {
  const { user } = useAuth();
  const userName = user?.display_name || user?.full_name?.split(' ')[0] || 'Traveler';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg',
      sender: 'agent',
      timestamp: 'Just now',
      content: `Hello ${userName}! I'm **Atlas**, your **Living Journey AI Agent**.\n\nI actively monitor your **Goa Getaway (12–16 May)** along with live weather, vendor availability, and transit feasibility.\n\n🌊 **Live Advisory**: I noticed an afternoon swell advisory on 13 May near Aguada. I can automatically shift your Mandovi backwater kayak to the calm 09:30 AM morning window to keep your day relaxed.\n\nHow would you like to shape your journey today?`,
      actionCard: {
        id: 'initial_weather_advisory',
        type: 'weather_alert',
        title: 'Goa Coastal Maritime Telemetry: Active Swell Advisory',
        subtitle: '13 May 2026 • Northern Sandbanks',
        description:
          'High tide and 2.4m swell detected between 14:00 and 17:30. Estuary waters in Mandovi remain calm for morning kayak navigation.',
        actionLabel: 'Shift Kayaking to 09:30 AM',
        actionPayload: 'shift_kayak_morning',
      },
      suggestedFollowUps: [
        'Shift Kayaking to 09:30 AM',
        'What should I pack for Goa?',
        'Show top vegetarian restaurants in Panjim',
        'What happens if my flight is delayed?',
      ],
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPreferencesDrawer, setShowPreferencesDrawer] = useState(false);
  const [context, setContext] = useState<AgentContext>(TravelAgentService.getContext());
  const [cardStatus, setCardStatus] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsTyping(true);

    try {
      const response = await TravelAgentService.generateResponse(query, messages);
      setMessages((prev) => [...prev, response]);
      setContext(TravelAgentService.getContext());
    } catch (err) {
      console.error('Failed to get agent response', err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleActionCardClick = (card: ActionCard) => {
    setCardStatus((prev) => ({ ...prev, [card.id]: 'Applied to Journey Pass' }));
    handleSendMessage(`Please apply: ${card.actionLabel || card.title}`);
  };

  const handlePaceChange = (pace: 'Relaxed' | 'Balanced' | 'Packed') => {
    const updated = TravelAgentService.updateContext({ userPace: pace });
    setContext(updated);
    handleSendMessage(`I'd like to change my travel pace to ${pace}.`);
  };

  const handleDietChange = (diet: string) => {
    const updated = TravelAgentService.updateContext({ userDiet: diet });
    setContext(updated);
    handleSendMessage(`Please update my dietary preference to ${diet}.`);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `reset_${Date.now()}`,
        sender: 'agent',
        timestamp: 'Just now',
        content: `Chat history reset. How can I help you architect your travel today?`,
        suggestedFollowUps: [
          'Optimize my Goa trip for the weather',
          'What should I pack for Goa?',
          'Build a 4-day Rajasthan tour',
        ],
      },
    ]);
  };

  return (
    <div
      className={`bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl shadow-xs overflow-hidden font-body flex flex-col h-[750px] relative ${className}`}
    >
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. AGENT CHATBOX TOP HEADER                                 */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-[#33231E]/10 bg-gradient-to-r from-[#F8F2EB] via-[#FFF9F3] to-[#F8F2EB] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-terracotta text-soft-ivory flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-600/30 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-[#1C1410] leading-tight">
                Atlas — Travel AI Agent
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-terracotta/10 text-terracotta text-[9px] font-mono font-bold tracking-wider uppercase border border-terracotta/20">
                <Sparkles className="w-2.5 h-2.5" />
                Living Engine AI
              </span>
            </div>
            <p className="text-[11px] text-[#8A7B75] mt-0.5 font-mono">
              Active Context: {initialDestination} Trip • {context.userPace} Pace • {context.userDiet}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Preferences Memory Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowPreferencesDrawer(!showPreferencesDrawer)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              showPreferencesDrawer
                ? 'bg-terracotta text-white border-terracotta shadow-xs'
                : 'bg-soft-ivory border-[#33231E]/20 text-[#8A7B75] hover:text-[#1C1410] hover:bg-[#F3E8DC]'
            }`}
            title="Inspect Agent Memory & Preferences"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agent Memory</span>
          </button>

          {/* Reset Chat */}
          <button
            type="button"
            onClick={handleResetChat}
            className="p-1.5 rounded-lg border border-[#33231E]/15 bg-soft-ivory text-[#8A7B75] hover:text-[#1C1410] hover:bg-[#F4ECE3] transition-colors"
            title="Reset Conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. CHAT MESSAGES BODY                                        */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#FAF4ED]/50">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in duration-200`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs text-xs ${
                  isUser
                    ? 'bg-[#1C1410] text-soft-ivory font-display font-semibold'
                    : 'bg-terracotta text-soft-ivory'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble & Content */}
              <div className={`max-w-[85%] sm:max-w-[75%] space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-4 rounded-2xl shadow-2xs text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-terracotta text-soft-ivory rounded-tr-xs'
                      : 'bg-soft-ivory border border-[#33231E]/15 text-[#1C1410] rounded-tl-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-body">
                    {msg.content}
                  </div>

                  <span
                    className={`text-[9px] font-mono block mt-2 ${
                      isUser ? 'text-soft-ivory/70 text-right' : 'text-[#8A7B75]'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {/* Embedded Action Card (If present in Agent Message) */}
                {msg.actionCard && (
                  <div className="bg-soft-ivory border border-terracotta/30 rounded-xl p-3.5 shadow-xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-terracotta font-bold block">
                          ACTIONABLE JOURNEY ADJUSTMENT
                        </span>
                        <h4 className="font-display text-xs sm:text-sm font-semibold text-[#1C1410]">
                          {msg.actionCard.title}
                        </h4>
                        {msg.actionCard.subtitle && (
                          <span className="text-[10px] text-[#8A7B75] font-mono block">
                            {msg.actionCard.subtitle}
                          </span>
                        )}
                      </div>

                      {msg.actionCard.type === 'weather_alert' && (
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                      {msg.actionCard.type === 'packing_checklist' && (
                        <div className="p-1.5 rounded-lg bg-sky-100 text-sky-800 shrink-0">
                          <Shirt className="w-4 h-4" />
                        </div>
                      )}
                      {msg.actionCard.type === 'preference_applied' && (
                        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-[#554742] leading-relaxed">
                      {msg.actionCard.description}
                    </p>

                    {msg.actionCard.actionLabel && (
                      <div className="pt-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleActionCardClick(msg.actionCard!)}
                          disabled={!!cardStatus[msg.actionCard.id]}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold shadow-2xs transition-all flex items-center gap-1.5 ${
                            cardStatus[msg.actionCard.id]
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-terracotta hover:bg-terracotta-hover text-white'
                          }`}
                        >
                          {cardStatus[msg.actionCard.id] ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{cardStatus[msg.actionCard.id]}</span>
                            </>
                          ) : (
                            <>
                              <span>{msg.actionCard.actionLabel}</span>
                              <ChevronRight className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Suggested Follow-Ups Pills */}
                {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggestedFollowUps.map((prompt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSendMessage(prompt)}
                        className="px-2.5 py-1 rounded-full bg-[#FAF3EC] hover:bg-[#F0E4D5] border border-[#33231E]/15 text-[10px] text-[#554742] font-medium transition-all hover:border-terracotta/40 text-left"
                      >
                        ⚡ {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-3 animate-in fade-in">
            <div className="w-8 h-8 rounded-full bg-terracotta text-soft-ivory flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="p-3.5 rounded-2xl bg-soft-ivory border border-[#33231E]/15 rounded-tl-xs shadow-2xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] font-mono text-[#8A7B75] ml-1.5">
                Atlas is calculating journey graph & weather feasibility...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. PREFERENCES MEMORY DRAWER (SLIDE-OVER PANEL)              */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showPreferencesDrawer && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-80 bg-[#FFF9F3] border-l border-[#33231E]/20 shadow-lg z-20 p-5 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[#33231E]/10">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-terracotta" />
              <h3 className="font-display text-sm font-semibold text-[#1C1410]">
                Agent Memory & Rules
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowPreferencesDrawer(false)}
              className="text-[#8A7B75] hover:text-[#1C1410] text-xs font-mono font-bold"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-[#8A7B75] leading-relaxed">
            Atlas uses these rules to filter itineraries, transit buffers, and dining suggestions:
          </p>

          {/* Rule: Pace */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#1C1410] block">
              Travel Pace
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
              {(['Relaxed', 'Balanced', 'Packed'] as const).map((pace) => (
                <button
                  key={pace}
                  type="button"
                  onClick={() => handlePaceChange(pace)}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                    context.userPace === pace
                      ? 'bg-terracotta text-white font-bold border-terracotta'
                      : 'bg-soft-ivory border-[#33231E]/15 text-[#8A7B75] hover:border-[#33231E]/30'
                  }`}
                >
                  {pace}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-[#8A7B75] block mt-0.5 font-mono">
              {context.userPace === 'Relaxed'
                ? '1–2 stops/day with 60m buffer'
                : context.userPace === 'Balanced'
                ? '2–3 stops/day with 30m buffer'
                : '4+ stops/day tightly packed'}
            </span>
          </div>

          {/* Rule: Diet */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#1C1410] block">
              Dietary Anchor
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              {['Vegetarian', 'Vegan', 'Seafood', 'Any'].map((diet) => (
                <button
                  key={diet}
                  type="button"
                  onClick={() => handleDietChange(diet)}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                    context.userDiet === diet
                      ? 'bg-terracotta text-white font-bold border-terracotta'
                      : 'bg-soft-ivory border-[#33231E]/15 text-[#8A7B75] hover:border-[#33231E]/30'
                  }`}
                >
                  {diet}
                </button>
              ))}
            </div>
          </div>

          {/* Rule: Budget Threshold */}
          <div className="space-y-1.5 pt-2 border-t border-[#33231E]/10">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono text-[10px] uppercase font-bold text-[#1C1410]">
                Budget Cap
              </span>
              <span className="font-mono font-bold text-terracotta">
                ₹{context.userBudget.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-soft-ivory border border-[#33231E]/10 space-y-1">
              <span className="text-[10px] text-[#8A7B75] block font-mono">
                Active Itinerary Allocation:
              </span>
              <div className="flex justify-between text-[11px] text-[#1C1410]">
                <span>Stays & Transfers</span>
                <span>₹24,500</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#1C1410]">
                <span>Activities & Dining</span>
                <span>₹12,000</span>
              </div>
              <div className="flex justify-between text-[11px] text-emerald-700 font-semibold border-t border-[#33231E]/10 pt-1">
                <span>Contingency Buffer</span>
                <span>₹3,500</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowPreferencesDrawer(false);
              handleSendMessage('Confirming my travel preferences are updated.');
            }}
            className="w-full py-2.5 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-mono uppercase font-bold tracking-wider shadow-xs transition-colors"
          >
            Apply & Tell Atlas
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. QUICK PROMPT SHORTCUT STRIP                               */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-[#33231E]/10 bg-[#FAF4ED] flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
        <span className="text-[10px] font-mono text-[#8A7B75] uppercase flex items-center gap-1 shrink-0">
          <Lightbulb className="w-3 h-3 text-amber-600" />
          Quick Ask:
        </span>
        {[
          'Optimize my Goa trip for the weather',
          'What should I pack for 5 days in Goa?',
          'Find top vegetarian dinner spots',
          'What happens if my flight is delayed 3h?',
          'Build a 4-day Rajasthan tour',
        ].map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSendMessage(prompt)}
            className="px-2.5 py-1 rounded-full bg-soft-ivory hover:bg-[#F3E8DC] border border-[#33231E]/15 text-[10px] text-[#554742] whitespace-nowrap transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 5. PROMPT INPUT BAR                                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3.5 bg-soft-ivory border-t border-[#33231E]/15 flex items-center gap-2.5 shrink-0"
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask Atlas about weather shifts, hidden spots, packing, or schedule changes..."
            className="w-full pl-3.5 pr-3 py-2.5 bg-[#FAF4ED] border border-[#33231E]/20 rounded-xl text-xs sm:text-sm text-[#1C1410] placeholder:text-[#8A7B75]/70 focus:outline-none focus:ring-1 focus:ring-terracotta focus:border-terracotta transition-colors"
            disabled={isTyping}
          />
        </div>

        <button
          type="submit"
          disabled={!inputPrompt.trim() || isTyping}
          className="p-2.5 rounded-xl bg-terracotta hover:bg-terracotta-hover text-white shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          title="Send Query to Atlas"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
