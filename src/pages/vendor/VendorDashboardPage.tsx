import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

export const VendorDashboardPage: React.FC = () => {
  return (
    <div className="space-y-8 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-espresso/15">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-stone-gray block">
            GRAND BOSPHORUS HOTEL • VENDOR PORTAL
          </span>
          <h1 className="font-display text-3xl text-deep-slate tracking-tight">
            Booking Reservations & Inventory Slots
          </h1>
        </div>

        <Button variant="accent">UPDATE AVAILABILITY SLOTS</Button>
      </div>

      {/* Booking Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Incoming Booking Verification Requests</CardTitle>
          <CardDescription>
            Confirm or adjust room allocation and experience slots for tour operator partners.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-xs border-collapse">
              <thead>
                <tr className="border-b border-espresso/15 bg-parchment/60 font-mono text-[10px] uppercase text-stone-gray">
                  <th className="p-4">Booking Ref</th>
                  <th className="p-4">Operator</th>
                  <th className="p-4">Item / Suite</th>
                  <th className="p-4">Dates</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-espresso/10">
                <tr>
                  <td className="p-4 font-mono font-semibold text-deep-slate">BK-88219</td>
                  <td className="p-4 font-medium text-deep-slate">SilkRoad Expeditions</td>
                  <td className="p-4 text-stone-gray">Bosphorus Deluxe Suite (3 Nights)</td>
                  <td className="p-4 font-mono text-stone-gray">Oct 12 - Oct 15</td>
                  <td className="p-4 font-mono font-semibold text-terracotta">$1,650</td>
                  <td className="p-4">
                    <Badge variant="active">PENDING VENDOR CONFIRMATION</Badge>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Button variant="primary" size="sm">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> CONFIRM
                    </Button>
                    <Button variant="outline" size="sm">
                      REJECT
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
