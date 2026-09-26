import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PlaceholderPageProps {
  title: string;
  domain: string;
  description?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  domain,
  description = 'This section is fully architected and ready for detailed feature execution in the upcoming phase.',
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 font-body">
      <div className="pb-4 border-b border-espresso/15">
        <span className="font-mono text-xs uppercase tracking-widest text-stone-gray block">
          TRIPLANNER ARCHITECTURE • {domain.toUpperCase()}
        </span>
        <h1 className="font-display text-3xl text-deep-slate tracking-tight mt-1">{title}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{title} Foundation</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-parchment border border-espresso/15 text-xs font-mono text-stone-gray">
            <span className="text-terracotta font-semibold">[READY FOR PHASE EXECUTION]</span> Domain boundary
            &apos;{domain}&apos; successfully wired into central route guards, role authorization model, and state providers.
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            RETURN TO PREVIOUS SCREEN
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
