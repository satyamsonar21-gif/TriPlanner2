import React, { useState } from 'react';
import {
  Check,
  Sparkles,
} from 'lucide-react';

export const PreferencesPage: React.FC = () => {
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['Adventure', 'Beaches', 'Cultural']);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Food',
    'Beaches',
    'Nature',
    'Adventure Sports',
    'Photography',
  ]);
  const [selectedStay, setSelectedStay] = useState<string>('Premium');
  const [selectedTransport, setSelectedTransport] = useState<string[]>(['Flight', 'Private Transfer']);
  const [selectedDiet, setSelectedDiet] = useState<string>('Vegetarian');
  const [selectedPace, setSelectedPace] = useState<'Relaxed' | 'Balanced' | 'Packed'>('Balanced');
  const [budgetCap, setBudgetCap] = useState<number>(65000);
  const [preferredDuration, setPreferredDuration] = useState<string>('Medium (5–7 days)');
  const [accessibilityNotes, setAccessibilityNotes] = useState<string>('No physical mobility restrictions. Prefer quiet rooms.');
  const [emergencyPhone, setEmergencyPhone] = useState<string>('+91 98102 34911');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const toggleArrayItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    if (list.includes(item)) {
      if (list.length > 1) setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  return (
    <div className="space-y-8 font-body pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#33231E]/10">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1410] tracking-tight">
            Travel Preferences
          </h1>
          <p className="text-xs sm:text-sm text-[#8A7B75] mt-1 font-body">
            Tell us how you like to travel. We&apos;ll use this to personalize your journeys.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2.5 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium font-mono uppercase tracking-wider shadow-2xs transition-all self-start sm:self-auto flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Save Preferences</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">
              Preferences successfully updated! All active and future journey graphs have been re-calibrated.
            </span>
          </div>
          <span className="font-mono text-[10px] text-emerald-700">SYNCED</span>
        </div>
      )}

      {/* Continuous Learning Reassurance Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF9F3] border border-terracotta/25 flex items-start gap-3.5 shadow-2xs">
        <Sparkles className="w-5 h-5 text-terracotta shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-display text-sm font-semibold text-[#1C1410]">
            Your preferences improve every future journey.
          </h4>
          <p className="text-xs text-[#8A7B75] leading-relaxed">
            The Living Journey Engine uses these parameters to rank alternative activities during disruptions, calculate optimal buffer intervals, and filter verified vendor inventories.
          </p>
        </div>
      </div>

      {/* Form Sections */}
      <div className="space-y-8 bg-[#FFF9F3] border border-[#33231E]/15 rounded-2xl p-6 sm:p-8 shadow-xs">
        {/* 1. Travel Style */}
        <div className="space-y-3">
          <label className="text-xs font-mono uppercase font-bold text-[#1C1410] tracking-wider block">
            01 / TRAVEL STYLE
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              'Adventure',
              'Relaxed',
              'Luxury',
              'Budget',
              'Cultural',
              'Family',
              'Romantic',
              'Solo',
              'Backpacking',
            ].map((st) => {
              const isSelected = selectedStyles.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => toggleArrayItem(selectedStyles, st, setSelectedStyles)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-terracotta text-white border-terracotta shadow-2xs font-semibold'
                      : 'bg-[#F8F3ED] text-[#33231E] border-[#33231E]/15 hover:border-[#33231E]/30'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Interests */}
        <div className="space-y-3 pt-6 border-t border-[#33231E]/10">
          <label className="text-xs font-mono uppercase font-bold text-[#1C1410] tracking-wider block">
            02 / PRIMARY INTERESTS
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              'Food',
              'Beaches',
              'Nature',
              'History',
              'Shopping',
              'Nightlife',
              'Adventure Sports',
              'Wellness',
              'Photography',
            ].map((interest) => {
              const isSelected = selectedInterests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleArrayItem(selectedInterests, interest, setSelectedInterests)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-terracotta text-white border-terracotta shadow-2xs font-semibold'
                      : 'bg-[#F8F3ED] text-[#33231E] border-[#33231E]/15 hover:border-[#33231E]/30'
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Accommodation Preferences */}
        <div className="space-y-3 pt-6 border-t border-[#33231E]/10">
          <label className="text-xs font-mono uppercase font-bold text-[#1C1410] tracking-wider block">
            03 / ACCOMMODATION TIER
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'Budget', label: 'Budget', desc: 'Boutique hostels & stays' },
              { id: 'Mid-range', label: 'Mid-Range', desc: '3★ heritage hotels' },
              { id: 'Premium', label: 'Premium', desc: '4–5★ boutique resorts' },
              { id: 'Luxury', label: 'Luxury', desc: 'Ultra-luxury villas & palaces' },
            ].map((tier) => (
              <div
                key={tier.id}
                onClick={() => setSelectedStay(tier.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedStay === tier.id
                    ? 'bg-[#EEDFD5] border-terracotta shadow-2xs ring-1 ring-terracotta/30'
                    : 'bg-[#F8F3ED] border-[#33231E]/15 hover:border-[#33231E]/30'
                }`}
              >
                <span className="font-semibold text-xs text-[#1C1410] block">{tier.label}</span>
                <span className="text-[10px] text-[#8A7B75] mt-0.5 block">{tier.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Transport Preferences */}
        <div className="space-y-3 pt-6 border-t border-[#33231E]/10">
          <label className="text-xs font-mono uppercase font-bold text-[#1C1410] tracking-wider block">
            04 / PREFERRED TRANSIT MODES
          </label>
          <div className="flex flex-wrap gap-2">
            {['Flight', 'Train', 'Bus', 'Private Transfer', 'Rental Car'].map((mode) => {
              const isSelected = selectedTransport.includes(mode);
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleArrayItem(selectedTransport, mode, setSelectedTransport)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-terracotta text-white border-terracotta font-semibold'
                      : 'bg-[#F8F3ED] text-[#33231E] border-[#33231E]/15 hover:border-[#33231E]/30'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Food & Diet */}
        <div className="space-y-3 pt-6 border-t border-[#33231E]/10">
          <label className="text-xs font-mono uppercase font-bold text-[#1C1410] tracking-wider block">
            05 / DIETARY REQUIREMENTS
          </label>
          <div className="flex flex-wrap gap-2">
            {['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Jain', 'No Preference'].map((diet) => (
              <button
                key={diet}
                type="button"
                onClick={() => setSelectedDiet(diet)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedDiet === diet
                    ? 'bg-terracotta text-white border-terracotta font-semibold'
                    : 'bg-[#F8F3ED] text-[#33231E] border-[#33231E]/15 hover:border-[#33231E]/30'
                }`}
              >
                {diet}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Trip Pace */}
        <div className="space-y-3 pt-6 border-t border-[#33231E]/10">
          <label className="text-xs font-mono uppercase font-bold text-[#1C1410] tracking-wider block">
            06 / DAILY TRAVEL PACE
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'Relaxed',
                title: 'Relaxed (1–2 stops/day)',
                desc: 'Generous morning downtime & unscheduled afternoons.',
              },
              {
                id: 'Balanced',
                title: 'Balanced (2–3 stops/day)',
                desc: 'Ideal balance between excursions, tastings, and beach time.',
              },
              {
                id: 'Packed',
                title: 'Packed (4+ stops/day)',
                desc: 'High-density sightseeing for maximum destination coverage.',
              },
            ].map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPace(p.id as any)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedPace === p.id
                    ? 'bg-[#EEDFD5] border-terracotta shadow-2xs ring-1 ring-terracotta/30'
                    : 'bg-[#F8F3ED] border-[#33231E]/15 hover:border-[#33231E]/30'
                }`}
              >
                <span className="font-semibold text-xs text-[#1C1410] block">{p.title}</span>
                <span className="text-[10px] text-[#8A7B75] mt-1 block leading-snug">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Budget Slider & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-[#33231E]/10">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono text-[#8A7B75] uppercase">PREFERRED TRIP BUDGET CAP:</span>
              <span className="font-mono font-bold text-terracotta">₹{budgetCap.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="20000"
              max="150000"
              step="5000"
              value={budgetCap}
              onChange={(e) => setBudgetCap(Number(e.target.value))}
              className="w-full accent-terracotta cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8A7B75]">
              <span>₹20,000 (Weekend)</span>
              <span>₹1,50,000+ (Grand Voyage)</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase font-bold text-[#1C1410] block">
              PREFERRED DURATION
            </label>
            <select
              value={preferredDuration}
              onChange={(e) => setPreferredDuration(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-[#F8F3ED] border border-[#33231E]/15 text-xs text-[#1C1410] focus:outline-none focus:border-terracotta"
            >
              <option value="Short (3–4 days)">Short (Weekend 3–4 days)</option>
              <option value="Medium (5–7 days)">Medium (Standard 5–7 days)</option>
              <option value="Long (8–14 days)">Long (Extended 8–14 days)</option>
            </select>
          </div>
        </div>

        {/* 8. Accessibility & Emergency Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-[#33231E]/10">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase font-bold text-[#1C1410] block">
              ACCESSIBILITY & SPECIAL REQUIREMENTS
            </label>
            <input
              type="text"
              value={accessibilityNotes}
              onChange={(e) => setAccessibilityNotes(e.target.value)}
              placeholder="e.g. Ground floor room preferred, quiet location..."
              className="w-full p-2.5 rounded-lg bg-[#F8F3ED] border border-[#33231E]/15 text-xs text-[#1C1410] focus:outline-none focus:border-terracotta"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase font-bold text-[#1C1410] block">
              EMERGENCY CONTACT PHONE
            </label>
            <input
              type="text"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-[#F8F3ED] border border-[#33231E]/15 text-xs text-[#1C1410] focus:outline-none focus:border-terracotta font-mono"
            />
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="pt-6 border-t border-[#33231E]/10 flex items-center justify-between">
          <span className="text-xs text-[#8A7B75]">
            Last saved: 10 mins ago • Profile verified
          </span>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white text-xs font-medium font-mono uppercase tracking-wider shadow-2xs"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
