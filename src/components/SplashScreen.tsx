
import { useEffect, useRef, useState } from 'react';

interface SplashScreenProps {
    onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [fading, setFading] = useState(false);
    const [videoError, setVideoError] = useState(false);

    useEffect(() => {
        // Fallback timeout in case video never triggers end
        const timer = setTimeout(() => {
            handleEnd();
        }, 6000); // 6s max wait

        return () => clearTimeout(timer);
    }, []);

    const handleEnd = () => {
        if (fading) return; // Prevent double call
        setFading(true);
        setTimeout(onFinish, 1000); // Wait for fade out
    };

    return (
        <div className={`fixed inset-0 z-50 bg-[#0f172a] flex flex-col items-center justify-center transition-opacity duration-1000 ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

            {/* Background Video */}
            {!videoError && (
                <video
                    ref={videoRef}
                    src="/intro.mp4"
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    onEnded={handleEnd}
                    onError={() => setVideoError(true)}
                />
            )}

            {/* Fallback Content (Visible only if video fails) */}
            {videoError && (
                <div className="relative z-10 flex flex-col items-center animate-pulse">
                    <div className="w-20 h-20 mb-4 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/50">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                        Legal Suite AI
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm tracking-widest uppercase">Initializing Interface...</p>
                </div>
            )}
        </div>
    );
}
