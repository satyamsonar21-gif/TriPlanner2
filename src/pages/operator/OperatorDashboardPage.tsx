import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export const OperatorDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-espresso/15">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-stone-gray block">
            SILKROAD EXPEDITIONS • OPERATOR CONTROL CENTER
          </span>
          <h1 className="font-display text-3xl text-deep-slate tracking-tight">
            Operational Overview & Disruption Monitoring
          </h1>
        </div>

        <Button variant="primary" onClick={() => navigate('/operator/tours')}>
          MANAGE TOUR CATALOG
        </Button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <span className="font-mono text-[10px] uppercase text-stone-gray block mb-1">
              ACTIVE JOURNEYS
            </span>
            <span className="font-display text-3xl text-deep-slate">14</span>
            <span className="text-[11px] font-mono text-[#2D5A37] block mt-1">
              98.2% Execution Rate
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="font-mono text-[10px] uppercase text-stone-gray block mb-1">
              OPEN DISRUPTIONS
            </span>
            <span className="font-display text-3xl text-burnt-clay">2</span>
            <span className="text-[11px] font-mono text-burnt-clay block mt-1">
              Requires Coordinator Review
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="font-mono text-[10px] uppercase text-stone-gray block mb-1">
              TOTAL CONFIRMED BOOKINGS
            </span>
            <span className="font-display text-3xl text-deep-slate">86</span>
            <span className="text-[11px] font-mono text-stone-gray block mt-1">
              $142,500 Gross Volume
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="font-mono text-[10px] uppercase text-stone-gray block mb-1">
              VENDOR VERIFICATION RATE
            </span>
            <span className="font-display text-3xl text-antique-brass">100%</span>
            <span className="text-[11px] font-mono text-[#2D5A37] block mt-1">
              18 Local Partners Active
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Operational Conflicts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active Disruption & Change Center</CardTitle>
            <CardDescription>
              Real-time conflict detection powered by Living Journey Engine™
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/operator/changes')}>
            VIEW ALL CHANGE REQUESTS
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-xs border-collapse">
              <thead>
                <tr className="border-b border-espresso/15 bg-parchment/60 font-mono text-[10px] uppercase text-stone-gray">
                  <th className="p-4">Journey ID</th>
                  <th className="p-4">Traveler</th>
                  <th className="p-4">Trigger Reason</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Engine Action</th>
                  <th className="p-4 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-espresso/10">
                <tr>
                  <td className="p-4 font-mono font-semibold text-deep-slate">IST-890722</td>
                  <td className="p-4 font-medium text-deep-slate">Elena Rostova</td>
                  <td className="p-4 text-stone-gray">TK1982 Flight Delay (+45 mins)</td>
                  <td className="p-4">
                    <Badge variant="disrupted">HIGH</Badge>
                  </td>
                  <td className="p-4 text-espresso font-mono text-[11px]">
                    2 Alternatives Synthesized
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/operator/changes')}
                    >
                      RESOLVE
                    </Button>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-mono font-semibold text-deep-slate">KYT-332190</td>
                  <td className="p-4 font-medium text-deep-slate">Julian Thorne</td>
                  <td className="p-4 text-stone-gray">Weather warning at Arashiyama Grove</td>
                  <td className="p-4">
                    <Badge variant="brass">MEDIUM</Badge>
                  </td>
                  <td className="p-4 text-espresso font-mono text-[11px]">
                    Indoor Tea Session Proposed
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/operator/changes')}
                    >
                      INSPECT
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Phase 03: Operator Spatial & Transfer Buffer Monitor */}
      <Card>
        <CardHeader>
          <CardTitle>Active Journey Spatial & Transfer Buffer Monitor</CardTitle>
          <CardDescription>
            Deterministic route feasibility and transfer buffer telemetry across live itineraries
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-parchment/50 border border-espresso/15 space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-stone-gray">JRN-GOA-01 • NORTH GOA</span>
              <Badge variant="disrupted">SWELL RISK</Badge>
            </div>
            <p className="font-semibold text-deep-slate">
              Candolim → Fort Aguada → Baga Reef → Panjim
            </p>
            <p className="text-stone-gray font-mono text-[11px]">
              4 Legs • 24.6 km • 15m Safety Buffers Verified • Candidate: Mandovi Kayaking (Feasible Fit)
            </p>
          </div>

          <div className="p-4 bg-parchment/50 border border-espresso/15 space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-stone-gray">IST-890722 • ISTANBUL</span>
              <Badge variant="disrupted">BUFFER DEFICIT -25M</Badge>
            </div>
            <p className="font-semibold text-deep-slate">
              IST Airport → Pera Hotel → Hagia Sophia
            </p>
            <p className="text-stone-gray font-mono text-[11px]">
              Flight TK1982 delay compresses transfer window below 15m minimum buffer.
            </p>
          </div>

          <div className="p-4 bg-parchment/50 border border-espresso/15 space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-stone-gray">KSH-260520 • KASHMIR</span>
              <Badge variant="confirmed">FEASIBLE</Badge>
            </div>
            <p className="font-semibold text-deep-slate">
              Dal Lake Houseboat → Gulmarg Gondola → Pahalgam
            </p>
            <p className="text-stone-gray font-mono text-[11px]">
              All mountain transfers clear 25m safety buffer margin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
