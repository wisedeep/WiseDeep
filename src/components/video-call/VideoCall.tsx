import { useEffect, useRef, useState } from 'react';
import { webRTCClient } from '@/lib/webrtc/client';
import { Mic, Video, PhoneOff } from 'lucide-react';

interface VideoCallProps {
  roomId: string;
  userId: string;
  onEndCall: () => void;
}

export function VideoCall({ roomId, userId, onEndCall }: VideoCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    // Initialize WebRTC client
    webRTCClient.connect();

    // Set up event listeners
    const handleLocalStream = (stream: MediaStream) => {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    };

    const handleRemoteStream = (userId: string, stream: MediaStream) => {
      setRemoteStreams(prev => new Map(prev).set(userId, stream));

      // Set the stream to the corresponding video element
      const videoElement = remoteVideoRefs.current.get(userId);
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    };

    // Join the room
    const joinRoom = async () => {
      try {
        await webRTCClient.joinRoom(roomId, { userId });
        setIsConnected(true);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to join room');
        console.error('Error joining room:', error);
      }
    };

    joinRoom();

    // Clean up on unmount
    return () => {
      webRTCClient.leaveRoom();
      webRTCClient.disconnect();
    };
  }, [roomId, userId]);

  // Render video elements for remote streams
  const renderRemoteVideos = () => {
    return Array.from(remoteStreams.entries()).map(([userId, stream]) => (
      <video
        key={userId}
        ref={(el) => {
          if (el) {
            remoteVideoRefs.current.set(userId, el);
            el.srcObject = stream;
          }
        }}
        autoPlay
        playsInline
        className="remote-video"
      />
    ));
  };

  return (
    <div className="video-call-container">
      <div className="video-grid">
        {/* Local video */}
        <div className="video-container local-video">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video-element"
          />
          <div className="video-overlay">You</div>
        </div>

        {/* Remote videos */}
        {renderRemoteVideos()}
      </div>

      {/* Controls */}
      <div className="call-controls">
        <button onClick={() => {/* Toggle mute */}}>
          <Mic />
        </button>
        <button onClick={() => {/* Toggle video */}}>
          <Video />
        </button>
        <button onClick={onEndCall} className="end-call">
          <PhoneOff />
        </button>
      </div>

      {/* Status and error messages */}
      {!isConnected && <div className="status">Connecting...</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
}