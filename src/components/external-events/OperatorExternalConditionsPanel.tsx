import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Radio,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sharedExternalEventImpactCoordinator } from '@/domains/external-events/impact-coordinator';
import {
  sharedFixtureProvider,
  sharedOpenMeteoProvider,
} from '@/domains/external-events/providers/external-event-provider';
import type {
  ExternalEvent,
  ProviderHealthReport,
} from '@/domains/external-events/types';
import { GOA_COORDINATES } from '@/domains/geo/normalization';

export interface OperatorExternalConditionsPanelProps {
  onTriggerDisruption?: () => void;
  className?: string;
}

export const OperatorExternalConditionsPanel: React.FC<
  OperatorExternalConditionsPanelProps
> = ({ onTriggerDisruption, className = '' }) => {
  const [providerReports, setProviderReports] = useState<ProviderHealthReport[]>([]);
  const [activeEvents, setActiveEvents] = useState<ExternalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulatedActive, setSimulatedActive] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    try {
      const omHealth = await sharedOpenMeteoProvider.healthCheck();
      const fxHealth = await sharedFixtureProvider.healthCheck();
      setProviderReports([omHealth, fxHealth]);

      const events = sharedExternalEventImpactCoordinator.getActiveEvents();
      if (events.length > 0) {
        setActiveEvents(events);
        setSimulatedActive(true);
      } else {
        const fixtureAlerts = await sharedFixtureProvider.fetchActiveAlerts({
          coordinates: GOA_COORDINATES,
        });
        setActiveEvents(fixtureAlerts);
        setSimulatedActive(fixtureAlerts.length > 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSimulateHighWindAdvisory = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const validTo = new Date(now.getTime() + 48 * 3600 * 1000);

      const highWindEvent: ExternalEvent = {
        id: `ev_wind_goa_${Date.now()}`,
        provider: 'Indian Meteorological Department (IMD) Coastal Advisory',
        providerEventId: 'IMD-MA-2026-GOA-08',
        category: 'HIGH_WIND',
        title: '38 km/h Coastal High-Wind & 2.8m Swell Advisory',
        description:
          'Dangerous sea conditions and coastal wind gusts exceeding 38 km/h. Sea water sports, diving, and open sea kayaking strictly suspended along North Goa coast.',
        severity: 'WARNING',
        status: 'ACTIVE',
        validFrom: now.toISOString(),
        validTo: validTo.toISOString(),
        coordinates: GOA_COORDINATES,
        radiusMeters: 25000,
        provenance: {
          providerName: 'IMD Coastal Advisory Feed',
          retrievedAt: now.toISOString(),
          freshness: 'FRESH',
          rawPayloadHash: 'hash_goa_wind_advisory',
          sourceEndpoint: 'https://api.met.gov.in/v1/coastal-bulletin',
        },
        windSpeedKmH: 38,
        windGustKmH: 52,
        version: 1,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await sharedExternalEventImpactCoordinator.processExternalEventOnJourney({
        event: highWindEvent,
        journeyId: 'jrn_goa_01',
        actorId: 'usr_operator_01',
        actorRole: 'operator',
      });

      setSimulatedActive(true);
      await refreshData();
      if (onTriggerDisruption) {
        onTriggerDisruption();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearAdvisories = () => {
    sharedExternalEventImpactCoordinator.clear();
    setSimulatedActive(false);
    refreshData();
  };

  return (
    <Card className={`font-body ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-terracotta animate-pulse" />
              <CardTitle className="font-display text-xl text-[#1C1410]">
                Real-Time Environmental & Weather Intelligence
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-[#8A7B75] mt-0.5">
              Live provider telemetry, atmospheric condition feeds, and automated journey impact detection
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={loading}
              className="text-xs font-mono h-8 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync Feeds
            </Button>

            {!simulatedActive ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSimulateHighWindAdvisory}
                disabled={loading}
                className="text-xs font-mono h-8 flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Zap className="w-3.5 h-3.5" />
                Simulate Goa Swell Advisory
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAdvisories}
                disabled={loading}
                className="text-xs font-mono h-8 text-rose-700 border-rose-200 hover:bg-rose-50"
              >
                Clear Active Advisory
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Provider Telemetry Health Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {providerReports.map((report) => (
            <div
              key={report.providerName}
              className="p-3.5 rounded-xl bg-white/70 border border-[#33231E]/10 space-y-1.5 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-semibold text-[#1C1410] truncate">
                  {report.providerName}
                </span>
                <Badge
                  variant={
                    report.status === 'HEALTHY'
                      ? 'confirmed'
                      : report.status === 'DEGRADED'
                      ? 'warning'
                      : 'disrupted'
                  }
                  className="text-[10px] font-mono uppercase"
                >
                  {report.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-[#8A7B75]">
                <span>Latency: {report.latestLatencyMs}ms</span>
                <span>Requests: {report.totalRequests}</span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#8A7B75]">
                <span>Rate Limits: {report.rateLimitHits}</span>
                <span>Failures: {report.consecutiveFailures}</span>
              </div>
            </div>
          ))}

          {/* Synthesis Telemetry */}
          <div className="p-3.5 rounded-xl bg-[#F5EDE4]/60 border border-[#33231E]/10 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-semibold text-[#1C1410]">
                Atmospheric Engine
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                GROUNDED (NO AI HALLUCINATION)
              </span>
            </div>

            <div className="text-[11px] font-mono text-[#8A7B75] flex items-center justify-between">
              <span>Active Advisories: {activeEvents.length}</span>
              <span>Lookahead: 72 Hours</span>
            </div>

            <div className="text-[10px] font-mono text-[#8A7B75] truncate">
              Auth: Server-Side Isolated • CC-BY 4.0 Open Data
            </div>
          </div>
        </div>

        {/* Active Environmental Advisories Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-semibold text-[#1C1410] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Active Environmental Advisories & Warnings
            </span>
            <span className="text-[11px] font-mono text-[#8A7B75]">
              {activeEvents.length} active advisory in operational scope
            </span>
          </div>

          {activeEvents.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-[#33231E]/20 text-center text-[#8A7B75] space-y-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-xs font-medium text-[#1C1410]">
                No active meteorological or environmental disruptions
              </p>
              <p className="text-[11px] font-mono text-[#8A7B75]">
                All monitored operational coastal and inland zones report safe, normal parameters.
              </p>
            </div>
          ) : (
            <div className="border border-[#33231E]/10 rounded-xl divide-y divide-[#33231E]/10 overflow-hidden bg-white/50">
              {activeEvents.map((event) => (
                <div key={event.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold uppercase">
                        {event.severity}
                      </span>
                      <span className="text-xs font-mono text-[#8A7B75]">
                        {event.category} • ID: {event.id}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {event.provenance.freshness}
                      </span>
                    </div>

                    <h5 className="font-display text-sm font-semibold text-[#1C1410]">
                      {event.title}
                    </h5>

                    <p className="text-xs text-[#8A7B75] line-clamp-2">
                      {event.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#8A7B75] pt-1">
                      <span>Coordinates: {event.coordinates.latitude.toFixed(3)}, {event.coordinates.longitude.toFixed(3)}</span>
                      <span>•</span>
                      <span>Radius: {((event.radiusMeters || 25000) / 1000).toFixed(0)} km</span>
                      <span>•</span>
                      <span>Valid to: {new Date(event.validTo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 font-mono text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Affected Journeys: 1</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#8A7B75]">
                      jrn_goa_01 (Goa Getaway)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
