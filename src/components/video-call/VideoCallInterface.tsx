import { useState, useRef, useEffect } from 'react';
import { VideoGrid } from './VideoGrid.tsx';
import { CallControls } from './CallControls.tsx';
import { CallChat } from './CallChat.tsx';
import { CallSettings } from './CallSettings.tsx';
import { CallRecorder } from './CallRecorder.tsx';
import { ScreenShare } from './ScreenShare.tsx';
import { CallQualityIndicator } from './CallQualityIndicator.tsx';
import { CallTimer } from './CallTimer.tsx';
import { CallControlsContainer } from './CallControlsContainer.tsx';
import { Button } from '../ui/button';
import { Maximize, Minimize, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  isVideoOn: boolean;
  isAudioOn: boolean;
  isSpeaking?: boolean;
}

export function VideoCallInterface() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'average' | 'poor' | 'offline'>('good');
  const [startTime] = useState(new Date());
  const [messages, setMessages] = useState<Array<{
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: Date;
    isOwn: boolean;
  }>>([]);

  // Mock participants - in a real app, these would come from your WebRTC implementation
  const localParticipant = {
    id: 'local',
    name: 'You',
    stream: null as MediaStream | null,
    isVideoOn,
    isAudioOn: !isMuted,
    isLocal: true,
  };

  const remoteParticipants: Participant[] = [
    {
      id: 'remote-1',
      name: 'Dr. Sarah Johnson',
      stream: null,
      isVideoOn: true,
      isAudioOn: true,
    },
    // Add more participants as needed
  ];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(console.error);
        setIsFullscreen(false);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In a real app, you would mute/unmute the audio track here
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    // In a real app, you would enable/disable the video track here
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    // Screen sharing would be handled by the ScreenShare component
  };

  const handleScreenShareStart = (stream: MediaStream) => {
    console.log('Screen sharing started', stream);
    // In a real app, you would add this stream to your WebRTC connection
  };

  const handleScreenShareStop = () => {
    console.log('Screen sharing stopped');
    // In a real app, you would remove the screen share stream from your WebRTC connection
  };

  const handleRecordingComplete = (blob: Blob) => {
    console.log('Recording complete', blob);
    // In a real app, you would upload this blob to your server
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${new Date().toISOString()}.webm`;
    a.click();
  };

  const handleSendMessage = (content: string) => {
    const newMessage = {
      id: Date.now().toString(),
      senderId: 'local',
      senderName: 'You',
      content,
      timestamp: new Date(),
      isOwn: true,
    };
    setMessages(prev => [...prev, newMessage]);

    // In a real app, you would send this message to other participants via WebRTC data channel
    // and they would add it to their messages state
  };

  const endCall = () => {
    // In a real app, you would clean up WebRTC connections here
    // router.push('/user/dashboard'); // Commented out as router is not available in this context
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 text-white overflow-hidden">
      {/* Main video grid */}
      <div className={cn(
        'h-full transition-all duration-300',
        isChatOpen ? 'mr-80' : 'mr-0'
      )}>
        <VideoGrid
          participants={remoteParticipants}
          localParticipant={localParticipant}
          onPinParticipant={setPinnedId}
          pinnedId={pinnedId}
        />
      </div>

      {/* Top bar with call info and controls */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 flex justify-between items-center z-10">
        <div className="flex items-center space-x-4">
          <CallTimer startTime={startTime} />
          <CallQualityIndicator connectionQuality={connectionQuality} />
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/10"
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={cn(
              'text-white hover:bg-white/10',
              isChatOpen && 'bg-white/20'
            )}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={endCall}
            className="text-white bg-red-600 hover:bg-red-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Bottom controls */}
      <CallControlsContainer position="bottom">
        <ScreenShare
          isActive={isScreenSharing}
          onStart={handleScreenShareStart}
          onStop={handleScreenShareStop}
        />

        <CallRecorder
          stream={localParticipant.stream}
          onRecordingComplete={handleRecordingComplete}
        />

        <CallSettings />

        <CallControls
          isMuted={isMuted}
          isVideoOn={isVideoOn}
          isScreenSharing={isScreenSharing}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onEndCall={endCall}
        />
      </CallControlsContainer>

      {/* Chat sidebar */}
      {isChatOpen && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col z-20">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-medium">Chat</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsChatOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <CallChat
            messages={messages}
            onSendMessage={handleSendMessage}
            className="flex-1"
          />
        </div>
      )}
    </div>
  );
}