import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
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

/**
 * Parses inline formatting such as **bold text**
 */
function renderFormattedInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-[#1C1410]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/**
 * Elegantly formats Markdown-like messages from Atlas:
 * Handles ### headings, bullet lists, emojis, bold highlights, and paragraphs
 */
const FormattedMessageContent: React.FC<{ content: string; isUser: boolean }> = ({
  content,
  isUser,
}) => {
  if (isUser) {
    return <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
  }

  const blocks = content.split('\n\n').filter(Boolean);

  return (
    <div className="space-y-3 text-xs sm:text-sm leading-relaxed text-[#2D211C]">
      {blocks.map((block, bIdx) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        const isAllBullets = lines.length > 0 && lines.every((l) => l.startsWith('- ') || l.startsWith('* '));

        if (isAllBullets) {
          return (
            <ul key={bIdx} className="space-y-2 py-0.5">
              {lines.map((line, lIdx) => {
                const itemText = line.replace(/^[-*]\s+/, '');
                return (
                  <li key={lIdx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-terracotta mt-1.5 shrink-0" />
                    <span className="flex-1 leading-relaxed">
                      {renderFormattedInline(itemText)}
                    </span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <div key={bIdx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              if (line.startsWith('### ')) {
                return (
                  <h4
                    key={lIdx}
                    className="font-display font-semibold text-xs sm:text-sm text-terracotta flex items-center gap-1.5 pt-1.5 pb-0.5 border-b border-[#33231E]/8"
                  >
                    {renderFormattedInline(line.replace('### ', ''))}
                  </h4>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h3
                    key={lIdx}
                    className="font-display font-bold text-sm text-[#1C1410] flex items-center gap-1.5 pt-2 pb-0.5"
                  >
                    {renderFormattedInline(line.replace('## ', ''))}
                  </h3>
                );
              }
              if (line.startsWith('- ') || line.startsWith('* ')) {
                const itemText = line.replace(/^[-*]\s+/, '');
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-terracotta mt-1.5 shrink-0" />
                    <span className="flex-1 leading-relaxed">
                      {renderFormattedInline(itemText)}
                    </span>
                  </div>
                );
              }
              return (
                <p key={lIdx} className="leading-relaxed">
                  {renderFormattedInline(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

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
  // Default to showing memory panel on larger screens for executive workspace feel
  const [showPreferencesDrawer, setShowPreferencesDrawer] = useState(true);
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

  // ──────────────────────────────────────────────────────────────────────────
  // AGENT MEMORY & RULES PANEL (Reusable for Docked and Overlay Modes)
  // ──────────────────────────────────────────────────────────────────────────
  const renderMemoryPanel = (isMobileOverlay = false) => (
    <div
      className={`bg-[#FFF9F3] flex flex-col h-full font-body ${
        isMobileOverlay
          ? 'w-full sm:w-96 shadow-2xl z-40'
          : 'w-80 xl:w-88 border-l border-[#33231E]/15 shrink-0 hidden lg:flex'
      }`}
    >
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-[#33231E]/10 bg-gradient-to-r from-[#F8F2EB] to-[#FFF9F3] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-terracotta/10 text-terracotta flex items-center justify-center border border-terracotta/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-[#1C1410] leading-none">
              Agent Memory & Rules
            </h3>
            <span className="text-[10px] text-[#8A7B75] font-mono mt-0.5 block">
              Living Engine Active State
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPreferencesDrawer(false)}
          className="p-1.5 rounded-lg hover:bg-[#33231E]/10 text-[#8A7B75] hover:text-[#1C1410] transition-colors"
          title="Close Panel"
        >
          <span className="text-sm font-bold font-mono">✕</span>
        </button>
      </div>

      {/* Scrollable Rules Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <p className="text-xs text-[#8A7B75] leading-relaxed">
          Atlas evaluates every recommendation against these active constraints:
        </p>

        {/* Current Anchor Trip */}
        <div className="p-3.5 rounded-xl bg-soft-ivory border border-[#33231E]/12 space-y-1 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-terracotta font-bold block">
            Anchor Journey
          </span>
          <div className="font-display text-sm font-semibold text-[#1C1410]">
            Goa Coastal Getaway
          </div>
          <div className="text-[11px] text-[#8A7B75] font-mono">
            12 May – 16 May 2026 • 4 Days
          </div>
        </div>

        {/* Rule: Travel Pace */}
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
                className={`py-2 px-2 rounded-xl border text-center transition-all ${
                  context.userPace === pace
                    ? 'bg-terracotta text-white font-bold border-terracotta shadow-2xs'
                    : 'bg-soft-ivory border-[#33231E]/15 text-[#8A7B75] hover:border-[#33231E]/30'
                }`}
              >
                {pace}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-[#8A7B75] block mt-1 font-mono">
            {context.userPace === 'Relaxed'
              ? '1–2 stops/day with 60m buffer'
              : context.userPace === 'Balanced'
              ? '2–3 stops/day with 30m buffer'
              : '4+ stops/day tightly packed'}
          </span>
        </div>

        {/* Rule: Dietary Preference */}
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
                className={`py-2 px-2 rounded-xl border text-center transition-all ${
                  context.userDiet === diet
                    ? 'bg-terracotta text-white font-bold border-terracotta shadow-2xs'
                    : 'bg-soft-ivory border-[#33231E]/15 text-[#8A7B75] hover:border-[#33231E]/30'
                }`}
              >
                {diet}
              </button>
            ))}
          </div>
        </div>

        {/* Rule: Budget Breakdown */}
        <div className="space-y-2 pt-2 border-t border-[#33231E]/10">
          <div className="flex justify-between items-center text-xs">
            <span className="font-mono text-[10px] uppercase font-bold text-[#1C1410]">
              Budget Cap
            </span>
            <span className="font-mono font-bold text-terracotta">
              ₹{context.userBudget.toLocaleString()}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-soft-ivory border border-[#33231E]/10 space-y-1.5 shadow-2xs">
            <span className="text-[10px] text-[#8A7B75] block font-mono">
              Active Itinerary Allocation:
            </span>
            <div className="flex justify-between text-xs text-[#1C1410]">
              <span>Stays & Transfers</span>
              <span className="font-mono font-medium">₹24,500</span>
            </div>
            <div className="flex justify-between text-xs text-[#1C1410]">
              <span>Activities & Dining</span>
              <span className="font-mono font-medium">₹12,000</span>
            </div>
            <div className="flex justify-between text-xs text-emerald-700 font-semibold border-t border-[#33231E]/10 pt-1.5">
              <span>Contingency Buffer</span>
              <span className="font-mono">₹3,500</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Sticky Footer */}
      <div className="p-4 border-t border-[#33231E]/10 bg-gradient-to-r from-[#F8F2EB] to-[#FFF9F3] shrink-0">
        <button
          type="button"
          onClick={() => {
            setShowPreferencesDrawer(false);
            handleSendMessage('Confirming my travel preferences are updated.');
          }}
          className="w-full py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-hover text-white text-xs font-mono uppercase font-bold tracking-wider shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <span>Apply & Update Memory</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl shadow-xs overflow-hidden font-body flex flex-row h-[720px] relative ${className}`}
    >
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. PRIMARY CHAT WORKSPACE (LEFT COLUMN)                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-[#33231E]/10 bg-gradient-to-r from-[#F8F2EB] via-[#FFF9F3] to-[#F8F2EB] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-terracotta text-soft-ivory flex items-center justify-center shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-600/30 animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-base font-semibold text-[#1C1410] leading-tight">
                  Atlas — Travel AI Agent
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-terracotta/10 text-terracotta text-[9px] font-mono font-bold tracking-wider uppercase border border-terracotta/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  Living Engine AI
                </span>
              </div>
              <p className="text-[11px] text-[#8A7B75] mt-0.5 font-mono truncate">
                Active Context: {initialDestination} Trip • {context.userPace} Pace • {context.userDiet}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Preferences Memory Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowPreferencesDrawer(!showPreferencesDrawer)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-2xs ${
                showPreferencesDrawer
                  ? 'bg-terracotta text-white border-terracotta font-semibold'
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
              className="p-1.5 rounded-lg border border-[#33231E]/15 bg-soft-ivory text-[#8A7B75] hover:text-[#1C1410] hover:bg-[#F4ECE3] transition-colors shadow-2xs"
              title="Reset Conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Conversation Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FAF4ED]/50">
          <div className="max-w-3xl mx-auto w-full space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 w-full animate-in fade-in duration-200 ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Bot Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-terracotta text-soft-ivory flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  {/* Message Bubble & Content */}
                  <div
                    className={`space-y-2.5 ${
                      isUser
                        ? 'max-w-[85%] sm:max-w-[70%] flex flex-col items-end'
                        : 'flex-1 max-w-[92%] sm:max-w-[85%]'
                    }`}
                  >
                    <div
                      className={`p-4 rounded-2xl shadow-2xs text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-terracotta text-soft-ivory rounded-tr-xs'
                          : 'bg-soft-ivory border border-[#33231E]/12 rounded-tl-xs text-[#1C1410]'
                      }`}
                    >
                      <FormattedMessageContent content={msg.content} isUser={isUser} />

                      <span
                        className={`text-[9px] font-mono block mt-2.5 ${
                          isUser
                            ? 'text-soft-ivory/70 text-right'
                            : 'text-[#8A7B75] pt-1.5 border-t border-[#33231E]/8'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Action Card (Agent Messages) */}
                    {msg.actionCard && (
                      <div className="w-full bg-[#FFFDF9] border border-terracotta/30 hover:border-terracotta/50 rounded-xl p-4 shadow-2xs space-y-3 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-terracotta animate-pulse" />
                              <span className="font-mono text-[9px] uppercase tracking-wider text-terracotta font-bold">
                                ACTIONABLE JOURNEY ADJUSTMENT
                              </span>
                            </div>
                            <h4 className="font-display text-sm font-semibold text-[#1C1410] leading-snug">
                              {msg.actionCard.title}
                            </h4>
                            {msg.actionCard.subtitle && (
                              <span className="text-[11px] text-[#8A7B75] font-mono block">
                                {msg.actionCard.subtitle}
                              </span>
                            )}
                          </div>

                          {msg.actionCard.type === 'weather_alert' && (
                            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 border border-amber-200 shadow-2xs">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                          {msg.actionCard.type === 'packing_checklist' && (
                            <div className="p-2 rounded-xl bg-sky-100 text-sky-800 shrink-0 border border-sky-200 shadow-2xs">
                              <Shirt className="w-4 h-4" />
                            </div>
                          )}
                          {msg.actionCard.type === 'preference_applied' && (
                            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-[#554742] leading-relaxed">
                          {msg.actionCard.description}
                        </p>

                        {msg.actionCard.actionLabel && (
                          <div className="pt-2 border-t border-[#33231E]/8 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleActionCardClick(msg.actionCard!)}
                              disabled={!!cardStatus[msg.actionCard.id]}
                              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider font-bold shadow-2xs transition-all flex items-center gap-1.5 ${
                                cardStatus[msg.actionCard.id]
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-terracotta hover:bg-terracotta-hover text-white active:scale-95'
                              }`}
                            >
                              {cardStatus[msg.actionCard.id] ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{cardStatus[msg.actionCard.id]}</span>
                                </>
                              ) : (
                                <>
                                  <span>{msg.actionCard.actionLabel}</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Suggested Follow-Ups */}
                    {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.suggestedFollowUps.map((prompt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSendMessage(prompt)}
                            className="px-3 py-1 rounded-full bg-[#FAF3EC] hover:bg-[#F0E4D5] border border-[#33231E]/15 hover:border-terracotta/40 text-[11px] text-[#554742] font-medium transition-all text-left flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="text-amber-600">⚡</span>
                            <span>{prompt}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-[#1C1410] text-soft-ivory flex items-center justify-center shrink-0 shadow-2xs font-display font-semibold text-xs mt-0.5">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-3 animate-in fade-in">
                <div className="w-8 h-8 rounded-full bg-terracotta text-soft-ivory flex items-center justify-center shrink-0 shadow-2xs">
                  <Bot className="w-4 h-4 animate-spin-slow" />
                </div>
                <div className="p-3.5 rounded-2xl bg-soft-ivory border border-[#33231E]/15 rounded-tl-xs shadow-2xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] font-mono text-[#8A7B75] ml-1.5">
                    Atlas is analyzing weather advisories and transit graph feasibility...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Prompts Shortcut Strip */}
        <div className="px-4 py-2 border-t border-[#33231E]/10 bg-[#FAF4ED] flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          <span className="text-[10px] font-mono text-[#8A7B75] uppercase flex items-center gap-1 shrink-0 font-semibold">
            <Lightbulb className="w-3 h-3 text-amber-600" />
            Quick Ask:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 pr-4">
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
                className="px-2.5 py-1 rounded-full bg-soft-ivory hover:bg-[#F3E8DC] border border-[#33231E]/15 hover:border-terracotta/30 text-[10px] text-[#554742] whitespace-nowrap transition-colors shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Unified Prompt Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 sm:p-4 bg-soft-ivory border-t border-[#33231E]/15 shrink-0"
        >
          <div className="max-w-3xl mx-auto w-full flex items-center gap-2 p-1.5 bg-[#FAF4ED] border border-[#33231E]/20 rounded-2xl focus-within:border-terracotta focus-within:ring-2 focus-within:ring-terracotta/15 transition-all shadow-2xs">
            <input
              ref={inputRef}
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask Atlas about weather shifts, hidden spots, packing, or schedule changes..."
              className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-[#1C1410] placeholder:text-[#8A7B75]/70 focus:outline-none"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isTyping}
              className="px-3.5 py-2 rounded-xl bg-terracotta hover:bg-terracotta-hover text-white shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5 text-xs font-mono font-semibold active:scale-95"
              title="Send Query to Atlas"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. DOCKED AGENT MEMORY PANEL (DESKTOP)                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showPreferencesDrawer && renderMemoryPanel(false)}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. MOBILE OVERLAY SLIDE-OVER (PHONE & TABLET)                */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showPreferencesDrawer && (
        <div className="lg:hidden absolute inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-[#1C1410]/25 backdrop-blur-[2px] transition-opacity animate-in fade-in"
            onClick={() => setShowPreferencesDrawer(false)}
          />
          <div className="relative h-full animate-in slide-in-from-right duration-250 z-10">
            {renderMemoryPanel(true)}
          </div>
        </div>
      )}
    </div>
  );
};
