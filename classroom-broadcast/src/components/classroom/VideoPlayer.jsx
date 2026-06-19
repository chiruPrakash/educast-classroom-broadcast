import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Volume2, VolumeX, Wifi, WifiOff, VideoOff, Mic, MicOff } from 'lucide-react';

export default function VideoPlayer({ stream, isConnected, isLecturerCamMuted, isLecturerMicMuted, isLecturerScreenSharing }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;

    const playVideo = () => {
      video.play().catch(error => {
        console.warn("[VideoPlayer] Autoplay blocked, trying muted:", error);
        video.muted = true;
        setIsMuted(true);
        video.play().catch(e => console.error("[VideoPlayer] Muted play failed:", e));
      });
    };

    video.addEventListener('loadedmetadata', playVideo);
    playVideo();

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.addEventListener('unmute', playVideo);
    }

    return () => {
      video.removeEventListener('loadedmetadata', playVideo);
      if (videoTrack) {
        videoTrack.removeEventListener('unmute', playVideo);
      }
    };
  }, [stream]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    setIsMuted(v === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(m => !m);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group">
      {stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain"
          />
          {isLecturerCamMuted && !isLecturerScreenSharing && (
            <div className="absolute inset-0 bg-[#0F1117]/95 flex flex-col items-center justify-center gap-3 z-10 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-white/3 flex items-center justify-center border border-white/5">
                <VideoOff size={24} className="text-white/30" />
              </div>
              <div className="text-center">
                <p className="text-white/40 text-sm font-body">Lecturer's camera is off</p>
                <p className="text-white/20 text-xs font-body mt-1">Audio is still live if broadcast is active</p>
              </div>
            </div>
          )}

          {/* Audio & Screen share state badge */}
          <div className="absolute bottom-3 left-3 flex gap-2 z-20">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border backdrop-blur-md transition-all duration-300
              ${isLecturerMicMuted
                ? 'bg-red-500/25 border-red-500/40 text-red-400'
                : 'bg-black/45 border-white/10 text-emerald-400'}`}>
              {isLecturerMicMuted ? <MicOff size={11} /> : <Mic size={11} />}
              {isLecturerMicMuted ? 'Lecturer Muted' : 'Live Audio'}
            </span>
            {isLecturerScreenSharing && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-blue-500/25 border border-blue-500/40 text-blue-300 backdrop-blur-md">
                Screen Sharing
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-white/3 flex items-center justify-center">
              {isConnected
                ? <Wifi size={24} className="text-emerald-400/50 animate-pulse" />
                : <WifiOff size={24} className="text-white/10" />
              }
            </div>
          </div>
          <div className="text-center">
            <p className="text-white/40 text-sm font-body">
              {isConnected ? 'Connecting to stream…' : 'Waiting for broadcast'}
            </p>
            <p className="text-white/20 text-xs font-body mt-1">
              {isConnected ? 'Connecting via LiveKit SFU…' : 'The lecturer has not started broadcasting yet'}
            </p>
          </div>
          {isConnected && (
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400/50 animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Controls overlay — visible on hover */}
      <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12">
          <div className="flex items-center gap-3">
            {/* Mute toggle */}
            <button onClick={toggleMute}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white">
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            {/* Volume slider */}
            <input
              type="range" min="0" max="1" step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolume}
              className="w-24 accent-emerald-400 h-1 cursor-pointer"
            />

            <div className="flex-1" />

            {/* Fullscreen */}
            <button onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white">
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      {stream && (
        <div className="absolute top-3 left-3">
          <div className="live-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            LIVE
          </div>
        </div>
      )}
    </div>
  );
}
