import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  url: string;
  thumbnail?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  onEnded?: () => void;
}

export function VideoPlayer({
  url,
  thumbnail,
  className = '',
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  onEnded
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && onEnded) {
      video.addEventListener('ended', onEnded);
      return () => {
        video.removeEventListener('ended', onEnded);
      };
    }
  }, [onEnded]);

  return (
    <div className={`relative aspect-video bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={url}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        className="w-full h-full object-contain"
        poster={thumbnail}
      />
    </div>
  );
}