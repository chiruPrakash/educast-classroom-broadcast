import { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor } from 'lucide-react';

export default function VideoPreview({ stream, isMuted, isCamOff, isScreenSharing }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(err => {
        console.warn("[VideoPreview] Play failed:", err);
      });
    }
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream && !isCamOff) {
      video.play().catch(err => {
        console.warn("[VideoPreview] Resume play failed:", err);
      });
    }
  }, [isCamOff, stream]);

  return (
    <div className="relative w-full aspect-video bg-ink-900 rounded-2xl overflow-hidden border border-white/5">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full ${isScreenSharing ? 'object-contain' : 'object-cover'}`}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-full bg-ink-700 flex items-center justify-center">
            <Video size={24} className="text-white/20" />
          </div>
          <p className="text-white/20 text-sm font-body">Camera not active</p>
        </div>
      )}

      {/* Overlays */}
      <div className="absolute bottom-3 left-3 flex gap-2">
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border backdrop-blur-md
          ${isMuted ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-black/40 border-white/10 text-white/60'}`}>
          {isMuted ? <MicOff size={11} /> : <Mic size={11} />}
          {isMuted ? 'Muted' : 'Live Audio'}
        </span>
        {isScreenSharing && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-blue-500/20 border border-blue-500/30 text-blue-300 backdrop-blur-md">
            <Monitor size={11} />Screen Share
          </span>
        )}
      </div>

      {isCamOff && stream && (
        <div className="absolute inset-0 bg-ink-900/90 flex items-center justify-center">
          <div className="text-center">
            <VideoOff size={32} className="text-white/20 mx-auto mb-2" />
            <p className="text-white/30 text-xs font-body">Camera Off</p>
          </div>
        </div>
      )}
    </div>
  );
}
