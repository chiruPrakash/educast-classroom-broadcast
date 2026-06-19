import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Radio, StopCircle } from 'lucide-react';

export default function ControlBar({
  isMuted, isCamOff, isScreenSharing, isBroadcasting,
  onToggleMic, onToggleCam, onToggleScreen, onStartBroadcast, onStopBroadcast,
  hasStream, sessionStatus
}) {
  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {/* Mic */}
      <button
        onClick={onToggleMic}
        disabled={!hasStream}
        title={isMuted ? 'Unmute' : 'Mute'}
        className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border transition-all active:scale-95 disabled:opacity-40
          ${isMuted
            ? 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25'
            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
      >
        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        <span className="text-xs font-body">{isMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      {/* Camera */}
      <button
        onClick={onToggleCam}
        disabled={!hasStream || isScreenSharing}
        title={isCamOff ? 'Show Camera' : 'Hide Camera'}
        className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border transition-all active:scale-95 disabled:opacity-40
          ${isCamOff
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
      >
        {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
        <span className="text-xs font-body">{isCamOff ? 'Show Cam' : 'Hide Cam'}</span>
      </button>

      {/* Screen Share */}
      <button
        onClick={onToggleScreen}
        disabled={!hasStream}
        title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border transition-all active:scale-95 disabled:opacity-40
          ${isScreenSharing
            ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25'
            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
      >
        {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
        <span className="text-xs font-body">{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
      </button>

      {/* Divider */}
      <div className="w-px h-12 bg-white/10" />

      {/* Broadcast Toggle */}
      {!isBroadcasting ? (
        <button
          onClick={onStartBroadcast}
          disabled={!hasStream || sessionStatus !== 'live'}
          className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 active:scale-95 transition-all disabled:opacity-40"
        >
          <Radio size={20} />
          <span className="text-xs font-body">Go Live</span>
        </button>
      ) : (
        <button
          onClick={onStopBroadcast}
          className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 active:scale-95 transition-all"
        >
          <StopCircle size={20} />
          <span className="text-xs font-body">Stop</span>
        </button>
      )}
    </div>
  );
}
