
'use client';
import Script from 'next/script';

const NativeBannerAd = () => {
    return (
        <div className="flex justify-center w-full">
            <Script
                async={true}
                data-cfasync={false}
                src="https://pl28511717.effectivegatecpm.com/3b6947615c3c331a7b5482ccd4db99a5/invoke.js"
                strategy="afterInteractive"
            />
            <div id="container-3b6947615c3c331a7b5482ccd4db99a5"></div>
        </div>
    );
};

export default NativeBannerAd;
