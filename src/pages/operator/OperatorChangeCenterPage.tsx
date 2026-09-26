import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  GitBranch,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  createGoaDemoJourneySnapshot,
  ensureGoaDemoChangeRequest,
  sharedLivingJourneyEngine,
  type EngineChangeRequest,
  type JourneySnapshot,
} from '@/domains/journey-engine';
import { ChangeReviewPanel } from '@/components/journey-engine';
import { GOA_JOURNEY_ITINERARY_STOPS, JourneyService } from '@/domains/journeys/journey.service';

export const OperatorChangeCenterPage: React.FC = () => {
  const navigate = useNavigate();

  const [changeRequest, setChangeRequest] = useState<EngineChangeRequest>(() =>
    ensureGoaDemoChangeRequest()
  );
  const [snapshot, setSnapshot] = useState<JourneySnapshot>(
    () => sharedLivingJourneyEngine.getSnapshot('jrn_goa_01')!
  );

  const outboxEvents = sharedLivingJourneyEngine.getOutboxEventsForJourney(
    snapshot.journeyId
  );

  const handleResetGoaDemo = () => {
    const freshSnap = createGoaDemoJourneySnapshot();
    sharedLivingJourneyEngine.registerSnapshot(freshSnap);
    const freshReq = sharedLivingJourneyEngine.detectAndAnalyzeChange({
      idempotencyKey: `idem_goa_reset_${Date.now()}`,
      journeyId: 'jrn_goa_01',
      triggerType: 'ITEM_CANCELLED',
      actorId: 'usr_operator_01',
      actorRole: 'operator',
      affectedItemId: 'itm_goa_03_scuba',
      title: 'Baga Reef Scuba Diving Cancelled (2.8m Coastal Swell Advisory)',
      reason:
        'Coast Guard & vendor Coastal Aqua cancelled 14:00 Baga Reef Scuba Diving due to 2.8m offshore swells.',
      requiresApproval: true,
    });
    JourneyService.syncFromEngineSnapshot({
      journeyId: 'jrn_goa_01',
      version: 17,
      allocatedCost: 38700,
      stops: GOA_JOURNEY_ITINERARY_STOPS,
    });
    setSnapshot(sharedLivingJourneyEngine.getSnapshot('jrn_goa_01')!);
    setChangeRequest(freshReq);
  };

  const handleTriggerFlightDelaySimulation = () => {
    const freshReq = sharedLivingJourneyEngine.detectAndAnalyzeChange({
      idempotencyKey: `idem_goa_delay_${Date.now()}`,
      journeyId: 'jrn_goa_01',
      triggerType: 'ITEM_DELAYED',
      actorId: 'usr_operator_01',
      actorRole: 'operator',
      affectedItemId: 'itm_goa_03_scuba',
      title: 'Operator Trigger: Afternoon Coastal Transfer Delayed (+45m)',
      reason:
        'NH-66 bridge congestion delayed afternoon marine departure by 45 minutes.',
      timeDeltaMinutes: 45,
      requiresApproval: true,
    });
    setSnapshot(sharedLivingJourneyEngine.getSnapshot('jrn_goa_01')!);
    setChangeRequest(freshReq);
  };

  return (
    <div className="space-y-8 font-body pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-espresso/15">
        <div>
          <button
            type="button"
            onClick={() => navigate('/operator/dashboard')}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-stone-gray hover:text-terracotta uppercase tracking-wider mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Operator Control Center</span>
          </button>
          <h1 className="font-display text-3xl text-deep-slate tracking-tight">
            Living Journey Engine™ — Operator Change & Disruption Center
          </h1>
          <p className="text-xs text-stone-gray mt-1">
            Inspect dependency graphs, trigger operational disruptions, compare
            deterministic alternatives, and execute atomic versioned changes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerFlightDelaySimulation}
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            SIMULATE +45M DELAY
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetGoaDemo}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            RESET GOA DEMO (v17)
          </Button>
        </div>
      </div>

      {/* Snapshot & Outbox Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="font-mono text-[10px] uppercase text-stone-gray block">
              LIVE JOURNEY VERSION
            </span>
            <span className="font-display text-2xl font-bold text-deep-slate mt-0.5 block">
              v{snapshot.version}
            </span>
            <span className="text-[11px] font-mono text-terracotta">
              Optimistic Lock Active
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="font-mono text-[10px] uppercase text-stone-gray block">
              ALLOCATED COST / CAP
            </span>
            <span className="font-display text-2xl font-bold text-deep-slate mt-0.5 block">
              ₹{snapshot.allocatedCost.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-[#2D5A37]">
              Cap: ₹{snapshot.totalBudget.toLocaleString()} (Hard Constraint)
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="font-mono text-[10px] uppercase text-stone-gray block">
              DEPENDENCY GRAPH EDGES
            </span>
            <span className="font-display text-2xl font-bold text-deep-slate mt-0.5 block">
              {snapshot.dependencies.length} Edges
            </span>
            <span className="text-[11px] font-mono text-stone-gray">
              Across {snapshot.items.length} Day 2 Stops
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="font-mono text-[10px] uppercase text-stone-gray block">
              TRANSACTIONAL OUTBOX
            </span>
            <span className="font-display text-2xl font-bold text-deep-slate mt-0.5 block">
              {outboxEvents.length} Events
            </span>
            <span className="text-[11px] font-mono text-[#2D5A37]">
              Idempotency Protected
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Main Change Review Panel (Operator Mode) */}
      <ChangeReviewPanel
        key={changeRequest.id + '_' + changeRequest.state}
        changeRequest={changeRequest}
        snapshot={snapshot}
        actorId="usr_operator_01"
        actorRole="operator"
        onChangeUpdated={(updatedReq, updatedSnap) => {
          setChangeRequest(updatedReq);
          setSnapshot(updatedSnap);
        }}
      />

      {/* Live Day 2 Dependency Graph & Outbox Event Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch className="w-4 h-4 text-terracotta" />
              <span>Live Journey Snapshot & Dependency Chain (v{snapshot.version})</span>
            </CardTitle>
            <CardDescription>
              Authoritative state of {snapshot.title} ({snapshot.journeyId})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            {snapshot.items.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-parchment/50 border border-espresso/15 flex items-center justify-between gap-3"
              >
                <div>
                  <span className="font-mono text-[10px] text-stone-gray block">
                    STOP #{idx + 1} • {item.displayWindow} •{' '}
                    {item.bookingState}
                  </span>
                  <span className="font-semibold text-deep-slate block">
                    {item.title}
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-deep-slate block">
                    ₹{item.price.toLocaleString()}
                  </span>
                  <Badge
                    variant={
                      item.status === 'disrupted' ? 'disrupted' : 'confirmed'
                    }
                  >
                    {(item.visualState || item.status).toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="w-4 h-4 text-terracotta" />
              <span>Transactional Outbox Events (Phase 06 Boundary)</span>
            </CardTitle>
            <CardDescription>
              Deterministic domain events emitted with unique idempotency keys
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs font-mono max-h-80 overflow-y-auto">
            {outboxEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-2.5 rounded-lg bg-parchment/50 border border-espresso/15 flex items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-terracotta block">
                    {evt.eventType}
                  </span>
                  <span className="text-[10px] text-stone-gray">
                    Key: {evt.idempotencyKey}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                  {evt.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
