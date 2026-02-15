const CameraCard = ({ name, room, status, onToggle }) => {
    return (
        <div className={`relative group bg-white dark:bg-card-dark rounded-3xl p-6 border transition-all hover:shadow-xl ${status ? 'border-primary/20 shadow-primary/5' : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{room}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{status ? 'Live' : 'Offline'}</span>
                </div>
            </div>

            <div className="relative aspect-video rounded-2xl bg-slate-900 overflow-hidden mb-4 group/camera">
                {status ? (
                    <>
                        <img
                            src="https://images.unsplash.com/photo-1558449028-b53a39d100fc?auto=format&fit=crop&q=80&w=400"
                            alt="Live Feed"
                            className="w-full h-full object-cover opacity-60"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-3 left-3 flex items-center gap-2">
                            <span className="material-icons-round text-white/80 text-sm">schedule</span>
                            <span className="text-[10px] text-white/80 font-medium">REC 00:04:12</span>
                        </div>
                        <button className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/camera:opacity-100 transition-opacity">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform">
                                <span className="material-icons-round text-white text-2xl">fullscreen</span>
                            </div>
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600">
                        <span className="material-icons-round text-4xl mb-2">videocam_off</span>
                        <span className="text-xs font-medium">Camera is disabled</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <button className="flex-1 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1">
                    <span className="material-icons-round text-sm">photo_camera</span>
                    Screenshot
                </button>
                <button className="flex-1 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1">
                    <span className="material-icons-round text-sm">history</span>
                    Playback
                </button>
            </div>
        </div>
    );
};

export default CameraCard;
