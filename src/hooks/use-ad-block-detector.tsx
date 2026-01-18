'use client';

import { useState, useEffect } from 'react';

export function useAdBlockDetector() {
  const [adBlockerDetected, setAdBlockerDetected] = useState(false);

  useEffect(() => {
    // Create a bait element
    const bait = document.createElement('div');
    bait.className = 'ad-banner text-ad ads ad-container';
    bait.style.position = 'absolute';
    bait.style.top = '-9999px';
    bait.style.left = '-9999px';
    bait.style.width = '1px';
    bait.style.height = '1px';
    bait.setAttribute('aria-hidden', 'true');

    document.body.appendChild(bait);

    // Check if the bait element is blocked
    const checkTimer = setTimeout(() => {
      if (bait.offsetHeight === 0 || window.getComputedStyle(bait).display === 'none') {
        setAdBlockerDetected(true);
      }
      // Cleanup: remove the bait element
      if (document.body.contains(bait)) {
        document.body.removeChild(bait);
      }
    }, 200); // Wait a bit for the ad blocker to act

    return () => {
      clearTimeout(checkTimer);
      if (document.body.contains(bait)) {
        document.body.removeChild(bait);
      }
    };
  }, []);

  return { adBlockerDetected };
}
