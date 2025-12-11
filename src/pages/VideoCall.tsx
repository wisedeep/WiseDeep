import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import io, { Socket } from 'socket.io-client';

const VideoCall = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [socket, setSocket] = useState<Socket | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isConnected) {
            interval = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isConnected]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        const initializeCall = async () => {
            try {
                // Get user media
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // Verify session with backend
                // @ts-ignore
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/video-call/initialize-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ sessionId })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to join session');
                }

                const data = await response.json();
                console.log('Session initialized:', data);

                const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
                    auth: { token: localStorage.getItem('token') },
                    transports: ['websocket'], // Force WebSocket only
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                });

                newSocket.on('connect', () => {
                    console.log('Connected to signaling server');
                    newSocket.emit('join-video-call', sessionId);
                });

                newSocket.on('user-joined', async () => {
                    console.log('Another user joined');
                    await createOffer(newSocket);
                });

                newSocket.on('offer', async (offer: RTCSessionDescriptionInit) => {
                    console.log('Received offer');
                    await handleOffer(offer, newSocket);
                });

                newSocket.on('answer', async (answer: RTCSessionDescriptionInit) => {
                    console.log('Received answer');
                    await peerConnectionRef.current?.setRemoteDescription(answer);
                    setIsConnected(true);
                });

                newSocket.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
                    console.log('Received ICE candidate');
                    await peerConnectionRef.current?.addIceCandidate(candidate);
                });

                setSocket(newSocket);

            } catch (error: any) {
                console.error('Error initializing call:', error);

                let errorMessage = '';
                if (error.name === 'NotAllowedError') {
                    errorMessage = 'Camera and microphone access denied. Please allow permissions in your browser settings and refresh the page.';
                } else if (error.name === 'NotFoundError') {
                    errorMessage = 'No camera or microphone found. Please connect a camera and microphone.';
                } else if (error.name === 'NotReadableError') {
                    errorMessage = 'Camera or microphone is already in use by another application or tab. Please close other apps/tabs using your camera.';
                } else if (error.name === 'OverconstrainedError') {
                    errorMessage = 'Camera/microphone configuration not supported. Please try with different settings.';
                } else {
                    errorMessage = `Could not access camera or microphone: ${error.message}. Please check your browser permissions.`;
                }

                toast({
                    title: 'Connection Error',
                    description: errorMessage,
                    variant: 'destructive',
                    duration: 6000
                });
            }
        };

        initializeCall();

        return () => {
            // Cleanup
            localStreamRef.current?.getTracks().forEach(track => track.stop());
            peerConnectionRef.current?.close();
            socket?.disconnect();
        };
    }, [sessionId]);

    const createPeerConnection = (socket: Socket) => {
        const configuration: RTCConfiguration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        const pc = new RTCPeerConnection(configuration);

        // Add local stream tracks
        localStreamRef.current?.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log('Received remote track');
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
                setIsConnected(true);
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { sessionId, candidate: event.candidate });
            }
        };

        peerConnectionRef.current = pc;
        return pc;
    };

    const createOffer = async (socket: Socket) => {
        const pc = createPeerConnection(socket);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { sessionId, offer });
    };

    const handleOffer = async (offer: RTCSessionDescriptionInit, socket: Socket) => {
        const pc = createPeerConnection(socket);
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { sessionId, answer });
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    const endCall = () => {
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        peerConnectionRef.current?.close();
        socket?.disconnect();
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 p-4 flex items-center justify-between">
                <div>
                    <h1 className="text-white text-xl font-semibold">Video Session</h1>
                    <p className="text-gray-400 text-sm">Session ID: {sessionId}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-white">
                        <Monitor className="w-5 h-5 inline mr-2" />
                        {formatDuration(callDuration)}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="text-gray-400 text-sm">
                        {isConnected ? 'Connected' : 'Connecting...'}
                    </span>
                </div>
            </div>

            {/* Video Grid */}
            <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Remote Video */}
                <Card className="bg-gray-800 border-gray-700 relative overflow-hidden">
                    <CardContent className="p-0 aspect-video">
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        {!isConnected && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                <p className="text-white">Waiting for other participant...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Local Video */}
                <Card className="bg-gray-800 border-gray-700 relative overflow-hidden">
                    <CardContent className="p-0 aspect-video">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover mirror"
                        />
                        <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded">
                            <span className="text-white text-sm">You</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Controls */}
            <div className="bg-gray-800 p-6 flex items-center justify-center gap-4">
                <Button
                    size="lg"
                    variant={isMuted ? 'destructive' : 'secondary'}
                    className="rounded-full w-14 h-14"
                    onClick={toggleMute}
                >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>

                <Button
                    size="lg"
                    variant={isVideoOff ? 'destructive' : 'secondary'}
                    className="rounded-full w-14 h-14"
                    onClick={toggleVideo}
                >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </Button>

                <Button
                    size="lg"
                    variant="destructive"
                    className="rounded-full w-14 h-14"
                    onClick={endCall}
                >
                    <PhoneOff className="w-6 h-6" />
                </Button>
            </div>

            <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
        </div>
    );
};

export default VideoCall;
