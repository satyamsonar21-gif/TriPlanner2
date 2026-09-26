import React from 'react';

interface LoadingStateProps {
  label?: string;
  sublabel?: string;
  height?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading Operational Data...',
  sublabel = 'Synchronizing with Living Journey Engine™',
  height = 'min-h-[300px]',
  className = '',
}) => {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center p-8 bg-soft-ivory border border-espresso/15 font-body ${height} ${className}`}
    >
      <div className="w-10 h-10 border-2 border-terracotta border-t-transparent rounded-full animate-spin mb-4" />
      <h4 className="font-display text-lg text-deep-slate font-medium">
        {label}
      </h4>
      <p className="font-mono text-xs text-stone-gray mt-1 uppercase tracking-wider">
        {sublabel}
      </p>
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`bg-parchment/60 border border-espresso/15 p-6 animate-pulse ${className}`}
  >
    <div className="h-4 bg-espresso/15 w-1/3 mb-3" />
    <div className="h-6 bg-espresso/20 w-2/3 mb-4" />
    <div className="h-3 bg-espresso/10 w-full mb-2" />
    <div className="h-3 bg-espresso/10 w-4/5" />
  </div>
);
