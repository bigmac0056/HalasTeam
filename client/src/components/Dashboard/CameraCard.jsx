import { useState, useRef, useEffect, useCallback } from 'react';

const CameraCard = ({ name, room, status, onToggle }) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsStreaming(false);
        setIsLoading(false);
    }, []);

    const startStream = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Explicit play is handled in onLoadedMetadata, but doing it here defensively too
            }
            setIsStreaming(true);
        } catch (err) {
            console.error("Camera access error:", err);
            setError("Доступ к камере запрещен");
            setIsStreaming(false);
            // If we failed to start stream but status is ON, we might want to turn it OFF 
            // to keep UI consistent, but let's just show error for now.
            // if (onToggle && status) onToggle(); 
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopStream();
        };
    }, [stopStream]);

    // React to external status changes. This is the SINGLE SOURCE OF TRUTH.
    useEffect(() => {
        if (status) {
            if (!isStreaming && !isLoading && !error) {
                startStream();
            }
        } else {
            if (isStreaming) {
                stopStream();
            }
        }
    }, [status, isStreaming, isLoading, error, startStream, stopStream]);

    const handleToggle = () => {
        // Just notify parent. Parent updates DB -> status prop changes -> useEffect triggers stream.
        if (onToggle) onToggle();
    };

    return (
        <div className={`relative group bg-white dark:bg-card-dark rounded-3xl p-6 border transition-all hover:shadow-xl ${status ? 'border-primary/20 shadow-primary/5' : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{room}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status && isStreaming ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{status && isStreaming ? 'Live' : 'Offline'}</span>
                </div>
            </div>

            <div className="relative aspect-video rounded-2xl bg-slate-900 overflow-hidden mb-4 group/camera">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full text-red-400">
                        <span className="material-icons-round text-4xl mb-2">videocam_off</span>
                        <span className="text-xs font-medium">{error}</span>
                    </div>
                ) : status ? (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            onLoadedMetadata={() => {
                                if (videoRef.current) {
                                    videoRef.current.play().catch(e => console.error("Play error:", e));
                                }
                            }}
                            className={`w-full h-full object-cover transition-opacity duration-500 ${isStreaming ? 'opacity-100' : 'opacity-0'}`}
                        />

                        {(!isStreaming || isLoading) && !error && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                        <div className="absolute bottom-3 left-3 flex items-center gap-2">
                            <span className={`material-icons-round text-sm ${isStreaming ? 'text-red-500 animate-pulse' : 'text-white/50'}`}>fiber_manual_record</span>
                            <span className="text-[10px] text-white/80 font-medium">LIVE</span>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600">
                        <span className="material-icons-round text-4xl mb-2">videocam_off</span>
                        <span className="text-xs font-medium">Камера отключена</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <button
                    onClick={handleToggle}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${status
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/30'
                        }`}
                >
                    <span className="material-icons-round text-sm">{status ? 'stop' : 'videocam'}</span>
                    {status ? 'Остановить' : 'Запустить'}
                </button>
            </div>
        </div>
    );
};

export default CameraCard;
