import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import io from 'socket.io-client';
import { useAuth } from '../components/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface VideoSessionProps {
  isOpen: boolean;
  onClose: () => void;
  counsellorName: string;
  sessionId: string;
  userType: string;
}

const VideoSession: React.FC<VideoSessionProps> = ({
  isOpen,
  onClose,
  counsellorName,
  sessionId,
  userType = 'user'
}) => {
  // Remove unused variable warning
  console.log('User type:', userType);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRemoteConnected, setIsRemoteConnected] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (isOpen) {
      initializeSocket();
      startVideoSession();
    } else {
      stopVideoSession();
    }

    return () => {
      stopVideoSession();
    };
  }, [isOpen]);

  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    // Use the same base URL as the API, but ensure it's the root domain/IP for socket.io
    // If VITE_API_URL is http://localhost:5000/api, we want http://localhost:5000
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const socketUrl = apiUrl.replace('/api', '');

    socketRef.current = io(socketUrl, {
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      // console.log('Connected to signaling server'); // Cleanup console.log
      socketRef.current.emit('join-room', {
        roomId: sessionId,
        userType,
        userId: user?.id
      });
    });

    socketRef.current.on('user-connected', (data) => {
      console.log('Remote user connected:', data);
      setIsRemoteConnected(true);
      if (userType === 'counsellor' && data.userType === 'user') {
        createOffer();
      }
    });

    socketRef.current.on('user-disconnected', (data) => {
      console.log('Remote user disconnected:', data);
      setIsRemoteConnected(false);
      setRemoteStream(null);
    });

    socketRef.current.on('offer', async (offer) => {
      await handleOffer(offer);
    });

    socketRef.current.on('answer', async (answer) => {
      await handleAnswer(answer);
    });

    socketRef.current.on('ice-candidate', async (candidate) => {
      await handleIceCandidate(candidate);
    });

    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to video session",
        variant: "destructive",
      });
    });
  };

  const startVideoSession = async () => {
    try {
      setIsRequestingPermissions(true);
      setPermissionError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setLocalStream(stream);
      setIsRequestingPermissions(false);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      createPeerConnection();
      setIsConnected(true);
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      setIsRequestingPermissions(false);

      let errorMessage = '';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera and microphone access denied. Please allow permissions in your browser settings and click "Grant Permissions" to try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect a camera and microphone, then click "Grant Permissions".';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera or microphone is already in use by another application. Please close other apps using your camera/microphone.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera/microphone configuration not supported. Please try with different settings.';
      } else {
        errorMessage = `Could not access camera or microphone: ${error.message}. Please check your browser permissions.`;
      }

      setPermissionError(errorMessage);
    }
  };

  const stopVideoSession = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setIsConnected(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsRemoteConnected(false);
    setRemoteStream(null);
    setPermissionError(null);
    setIsRequestingPermissions(false);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const createPeerConnection = () => {
    peerConnectionRef.current = new RTCPeerConnection(configuration);

    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, localStream);
      });
    }

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', event.candidate);
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnectionRef.current?.connectionState);
    };
  };

  const createOffer = async () => {
    if (!peerConnectionRef.current) return;

    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit('offer', offer);
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      if (socketRef.current) {
        socketRef.current.emit('answer', answer);
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const handleEndCall = () => {
    stopVideoSession();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[95vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">Video Session with {counsellorName}</DialogTitle>
        </DialogHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Local Video */}
            <div className="relative">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isConnected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="text-center text-muted-foreground">
                      <Video className="w-12 h-12 mx-auto mb-2" />
                      <p>Connecting...</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                You ({isMuted ? 'Muted' : 'Unmuted'})
              </div>
            </div>

            {/* Remote Video */}
            <div className="relative">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!remoteStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="text-center text-muted-foreground">
                      <Video className="w-12 h-12 mx-auto mb-2" />
                      <p>{isRemoteConnected ? `Connected with ${counsellorName}` : `Waiting for ${counsellorName}...`}</p>
                      <p className="text-xs">Remote video will appear here</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {counsellorName}
              </div>
            </div>
          </div>

          {/* Video Controls */}
          <div className="flex justify-center items-center gap-6 mt-8">
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="lg"
              onClick={toggleMute}
              className="rounded-full w-16 h-16 p-0 shadow-lg hover:scale-110 transition-transform"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            <Button
              variant={isVideoOff ? "destructive" : "outline"}
              size="lg"
              onClick={toggleVideo}
              className="rounded-full w-16 h-16 p-0 shadow-lg hover:scale-110 transition-transform"
              title={isVideoOff ? "Turn On Video" : "Turn Off Video"}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              onClick={handleEndCall}
              className="rounded-full w-16 h-16 p-0 shadow-lg hover:scale-110 transition-transform bg-red-600 hover:bg-red-700"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>

          <div className="text-center mt-6 space-y-2">
            <p className="text-sm text-muted-foreground">Session ID: {sessionId}</p>
            {isRemoteConnected && (
              <p className="text-sm font-medium text-green-600">✓ Connected</p>
            )}
          </div>
        </CardContent>
      </DialogContent>
    </Dialog>
  );
};

export default VideoSession;