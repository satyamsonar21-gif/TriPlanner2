import React, { useEffect, useState } from 'react';

/**
 * TravelDecorations — Floating, animated decorative elements that add life to the page.
 * Pure CSS keyframes + minimal JS for parallax. Zero AI-generated assets.
 *
 * Elements:
 * 1. Compass Rose — rotates slowly
 * 2. Paper Airplane — drifts across with a flight path
 * 3. Dotted Globe Lines — pulsing orbital arcs
 * 4. Travel Stamps — fade in/out
 * 5. Floating Particles — drift upward like embers
 */

/**
 * CompassRose — A pure CSS/SVG compass that rotates slowly
 */
export const CompassRose: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 120,
}) => (
  <div
    className={`animate-compass-spin pointer-events-none select-none ${className}`}
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      style={{ opacity: 0.12 }}
    >
      {/* Outer ring */}
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="0.5" className="text-espresso" />
      <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="0.3" className="text-espresso" strokeDasharray="2 4" />
      
      {/* Cardinal direction lines */}
      <line x1="50" y1="4" x2="50" y2="20" stroke="currentColor" strokeWidth="1.5" className="text-terracotta" />
      <line x1="50" y1="80" x2="50" y2="96" stroke="currentColor" strokeWidth="0.5" className="text-espresso" />
      <line x1="4" y1="50" x2="20" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-espresso" />
      <line x1="80" y1="50" x2="96" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-espresso" />
      
      {/* Intercardinal lines */}
      <line x1="17" y1="17" x2="27" y2="27" stroke="currentColor" strokeWidth="0.3" className="text-antique-brass" />
      <line x1="73" y1="17" x2="83" y2="27" stroke="currentColor" strokeWidth="0.3" className="text-antique-brass" />
      <line x1="17" y1="83" x2="27" y2="73" stroke="currentColor" strokeWidth="0.3" className="text-antique-brass" />
      <line x1="73" y1="83" x2="83" y2="73" stroke="currentColor" strokeWidth="0.3" className="text-antique-brass" />
      
      {/* North pointer */}
      <polygon points="50,8 46,30 50,24 54,30" fill="currentColor" className="text-terracotta" />
      
      {/* Center dot */}
      <circle cx="50" cy="50" r="3" fill="currentColor" className="text-terracotta" />
      <circle cx="50" cy="50" r="1.5" fill="currentColor" className="text-soft-ivory" />
      
      {/* Cardinal letters */}
      <text x="50" y="16" textAnchor="middle" className="text-terracotta" fill="currentColor" fontSize="5" fontFamily="monospace" fontWeight="bold">N</text>
      <text x="50" y="94" textAnchor="middle" className="text-espresso" fill="currentColor" fontSize="4" fontFamily="monospace">S</text>
      <text x="10" y="52" textAnchor="middle" className="text-espresso" fill="currentColor" fontSize="4" fontFamily="monospace">W</text>
      <text x="92" y="52" textAnchor="middle" className="text-espresso" fill="currentColor" fontSize="4" fontFamily="monospace">E</text>
    </svg>
  </div>
);

/**
 * PaperAirplane — A CSS-animated paper airplane that flies across the viewport
 */
export const PaperAirplane: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-flight-path pointer-events-none select-none ${className}`}
    style={{ opacity: 0.08 }}
    aria-hidden="true"
  >
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 20L36 4L28 20L36 36L4 20Z"
        fill="currentColor"
        className="text-terracotta"
      />
      <line x1="4" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="0.5" className="text-soft-ivory" />
    </svg>
  </div>
);

/**
 * FloatingParticles — Ember-like particles that drift upward
 * Creates a subtle sense of warmth and movement
 */
export const FloatingParticles: React.FC<{ count?: number; className?: string }> = ({
  count = 12,
  className = '',
}) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${5 + Math.random() * 90}%`,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 8,
    duration: 8 + Math.random() * 12,
    opacity: 0.04 + Math.random() * 0.08,
    drift: -20 + Math.random() * 40,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-ember-rise rounded-full"
          style={{
            left: p.left,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: 'var(--terracotta)',
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * DottedFlightPath — An animated dotted arc suggesting travel routes
 */
export const DottedFlightPath: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    className={`pointer-events-none select-none ${className}`}
    viewBox="0 0 600 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ opacity: 0.06 }}
  >
    <path
      d="M20 180 Q 150 20 300 100 Q 450 180 580 40"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-terracotta animate-dash-draw"
      strokeDasharray="6 8"
      fill="none"
    />
    {/* Origin point */}
    <circle cx="20" cy="180" r="4" fill="currentColor" className="text-terracotta animate-pulse-glow" />
    {/* Waypoint */}
    <circle cx="300" cy="100" r="3" fill="currentColor" className="text-antique-brass" />
    {/* Destination */}
    <circle cx="580" cy="40" r="4" fill="currentColor" className="text-terracotta animate-pulse-glow" />
  </svg>
);

/**
 * TravelStamps — Faded passport-style stamps that rotate in/out
 */
export const TravelStamps: React.FC<{ className?: string }> = ({ className = '' }) => {
  const stamps = [
    { text: 'ARRIVAL\nJAIPUR\nINDIA', rotation: -12, x: '8%', y: '20%' },
    { text: 'DEPARTURE\nISTANBUL\n✈', rotation: 8, x: '85%', y: '15%' },
    { text: 'TRANSIT\nDUBAI\nUAE', rotation: -5, x: '75%', y: '70%' },
    { text: 'VERIFIED\nKERALA\nBACKWATERS', rotation: 15, x: '12%', y: '75%' },
  ];

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`} aria-hidden="true">
      {stamps.map((stamp, idx) => (
        <div
          key={idx}
          className="absolute animate-stamp-appear"
          style={{
            left: stamp.x,
            top: stamp.y,
            transform: `rotate(${stamp.rotation}deg)`,
            animationDelay: `${idx * 2.5}s`,
          }}
        >
          <div
            className="border-2 border-terracotta/[0.06] rounded-full px-4 py-3"
            style={{ borderStyle: 'double' }}
          >
            <span
              className="font-mono text-[7px] uppercase tracking-[0.2em] text-terracotta/[0.08] text-center whitespace-pre-line block leading-tight font-bold"
            >
              {stamp.text}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * ScrollProgressCompass — A small compass in the corner that rotates as you scroll
 */
export const ScrollProgressCompass: React.FC = () => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent =
        window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      setRotation(scrollPercent * 720); // Two full rotations across the page
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="fixed bottom-6 right-6 z-40 w-10 h-10 hidden lg:flex items-center justify-center"
      title="Scroll progress"
      style={{ opacity: 0.5 }}
    >
      <svg
        viewBox="0 0 40 40"
        className="w-full h-full text-terracotta"
        style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease-out' }}
      >
        <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.3" />
        <polygon points="20,4 17,18 20,15 23,18" fill="currentColor" opacity="0.6" />
        <circle cx="20" cy="20" r="2" fill="currentColor" opacity="0.4" />
      </svg>
    </div>
  );
};
