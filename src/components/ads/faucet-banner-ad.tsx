'use client';
import { useEffect, useRef } from 'react';

const FaucetBannerAd = () => {
    const adRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // We check if the ad has already been loaded.
        if (adRef.current && adRef.current.children.length === 0) {
            const script1 = document.createElement('script');
            script1.innerHTML = `
                atOptions = {
                    'key' : '1cf8ca9b81fd100432b4228cc475b579',
                    'format' : 'iframe',
                    'height' : 250,
                    'width' : 300,
                    'params' : {}
                };
            `;
            
            const script2 = document.createElement('script');
            script2.src = 'https://www.highperformanceformat.com/1cf8ca9b81fd100432b4228cc475b579/invoke.js';
            script2.async = true;

            adRef.current.appendChild(script1);
            adRef.current.appendChild(script2);
        }

        return () => {
            if (adRef.current) {
                // Clear the content to avoid issues on re-renders/navigation
                adRef.current.innerHTML = '';
            }
        };
    }, []);

    return <div ref={adRef} className="flex items-center justify-center bg-muted/20 rounded-md border-2 border-dashed border-primary/50" style={{ width: '300px', height: '250px' }}></div>;
};

export default FaucetBannerAd;
