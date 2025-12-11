import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Video, VideoOff, User } from 'lucide-react';
import { Button } from '../ui/button';

interface VideoTileProps {
  participant: {
    id: string;
    name: string;
    stream: MediaStream | null;
    isVideoOn: boolean;
    isAudioOn: boolean;
    isSpeaking?: boolean;
    isLocal?: boolean;
  };
  isPinned: boolean;
  onClick: () => void;
  className?: string;
}

export function VideoTile({ participant, isPinned, onClick, className = '' }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div
      className={cn(
        'relative bg-gray-900 rounded-lg overflow-hidden group',
        isPinned ? 'h-full' : 'h-full',
        participant.isSpeaking && 'ring-2 ring-blue-500',
        className
      )}
      onClick={onClick}
    >
      {/* Video element */}
      {participant.isVideoOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      )}

      {/* Participant info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white truncate">
            {participant.name} {participant.isLocal && '(You)'}
          </span>
          <div className="flex space-x-1">
            {!participant.isAudioOn && <MicOff className="h-3 w-3 text-red-500" />}
            {!participant.isVideoOn && <VideoOff className="h-3 w-3 text-red-500" />}
          </div>
        </div>
      </div>

      {/* Hover overlay for pinning */}
      {!isPinned && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 text-white hover:bg-white/20"
          >
            Pin to Main View
          </Button>
        </div>
      )}
    </div>
  );
}