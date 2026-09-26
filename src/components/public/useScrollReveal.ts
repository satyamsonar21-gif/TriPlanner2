import { useEffect, useRef } from 'react';

/**
 * IntersectionObserver hook that adds 'revealed' class to elements
 * with 'reveal-on-scroll' class when they enter the viewport.
 * Call once in a parent component to enable scroll-reveal animations
 * on any child with the .reveal-on-scroll CSS class.
 */
export function useScrollReveal(rootMargin = '0px 0px -60px 0px') {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target); // Only reveal once
          }
        });
      },
      { rootMargin, threshold: 0.12 }
    );

    // Observe all children with the .reveal-on-scroll class
    const elements = container.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [rootMargin]);

  return containerRef;
}
