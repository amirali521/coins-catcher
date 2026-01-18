
'use client';
import { useEffect, useRef } from 'react';

export function BannerAd() {
    const adRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (adRef.current && adRef.current.children.length === 0) {
            const script1 = document.createElement('script');
            script1.innerHTML = `
                atOptions = {
                    'key' : '7a3a86e59364228142a5ad8972a0800f',
                    'format' : 'iframe',
                    'height' : 50,
                    'width' : 320,
                    'params' : {}
                };
            `;
            
            const script2 = document.createElement('script');
            script2.src = 'https://www.highperformanceformat.com/7a3a86e59364228142a5ad8972a0800f/invoke.js';
            script2.async = true;

            adRef.current.appendChild(script1);
            adRef.current.appendChild(script2);
        }

        return () => {
            if (adRef.current) {
                adRef.current.innerHTML = '';
            }
        };
    }, []);

    return <div ref={adRef} className="flex items-center justify-center" style={{ width: '320px', height: '50px' }}></div>;
}
