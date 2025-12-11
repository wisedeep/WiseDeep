import { Button } from '../ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff } from 'lucide-react';

interface CallControlsProps {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  className?: string;
}

export function CallControls({
  isMuted,
  isVideoOn,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  className = '',
}: CallControlsProps) {
  return (
    <div className={`flex justify-center space-x-4 p-4 bg-gray-800 rounded-lg ${className}`}>
      <Button
        variant={isMuted ? 'destructive' : 'secondary'}
        size="icon"
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>

      <Button
        variant={isVideoOn ? 'secondary' : 'destructive'}
        size="icon"
        onClick={onToggleVideo}
        aria-label={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
      >
        {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </Button>

      <Button
        variant={isScreenSharing ? 'default' : 'secondary'}
        size="icon"
        onClick={onToggleScreenShare}
        aria-label={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
      >
        {isScreenSharing ? (
          <MonitorOff className="h-5 w-5" />
        ) : (
          <Monitor className="h-5 w-5" />
        )}
      </Button>

      <Button
        variant="destructive"
        size="icon"
        onClick={onEndCall}
        className="bg-red-600 hover:bg-red-700"
        aria-label="End call"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}