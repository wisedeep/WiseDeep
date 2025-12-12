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

    // State
    const [socket, setSocket] = useState<Socket | null>(null);
    const [userRole, setUserRole] = useState<'caller' | 'callee' | null>(null);
    const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const iceServersRef = useRef<any[]>([]);

    // Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (connectionState === 'connected') {
            interval = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [connectionState]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // ==================== PEER CONNECTION SETUP ====================
    const createPeerConnection = (socket: Socket): RTCPeerConnection => {
        console.log('🔧 Creating peer connection...');

        // Use fetched ICE servers or fallback to Google STUN
        const iceServers = iceServersRef.current.length > 0
            ? iceServersRef.current
            : [{ urls: 'stun:stun.l.google.com:19302' }];

        const pc = new RTCPeerConnection({
            iceServers: iceServers
        });

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
                console.log(`➕ Added ${track.kind} track to peer connection`);
            });
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
            console.log(`🎥 Received remote ${event.track.kind} track`);
            if (remoteVideoRef.current && event.streams[0]) {
                remoteVideoRef.current.srcObject = event.streams[0];
                setConnectionState('connected');
                console.log('✅ Remote video connected!');
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate');
                socket.emit('video:ice-candidate', {
                    sessionId,
                    candidate: event.candidate
                });
            }
        };

        // Connection state monitoring
        pc.onconnectionstatechange = () => {
            console.log(`🔌 Connection state: ${pc.connectionState}`);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                setConnectionState(pc.connectionState === 'failed' ? 'failed' : 'disconnected');
                toast({
                    title: 'Connection Lost',
                    description: 'The video connection was lost',
                    variant: 'destructive'
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`🧊 ICE connection state: ${pc.iceConnectionState}`);
        };

        peerConnectionRef.current = pc;
        return pc;
    };

    // ==================== MAIN INITIALIZATION ====================
    useEffect(() => {
        let newSocket: Socket | undefined;

        const initialize = async () => {
            try {
                console.log('\n🎬 Initializing video call...');

                // Fetch TURN credentials
                try {
                    const apiKey = import.meta.env.VITE_METERED_API_KEY;
                    if (!apiKey) {
                        console.warn('⚠️ VITE_METERED_API_KEY is missing! Video calls might fail outside local network.');
                    }
                    const response = await fetch(`https://wisedeep.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`);
                    const iceServers = await response.json();
                    iceServersRef.current = iceServers;
                    console.log('✅ Fetched TURN credentials');
                } catch (error) {
                    console.error('❌ Failed to fetch TURN credentials:', error);
                }

                // Get user media first
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                console.log('✅ Got local media stream');

                // Verify session
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/video-call/initialize-session`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ sessionId })
                    }
                );

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to join session');
                }

                console.log('✅ Session verified');

                // Determine Socket URL
                // Priority 1: Explicit VITE_SOCKET_URL (Best for production)
                // Priority 2: Sanitize VITE_API_URL (Fallback)
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                let socketUrl = import.meta.env.VITE_SOCKET_URL;

                if (!socketUrl) {
                    console.log('ℹ️ VITE_SOCKET_URL not set, sanitizing VITE_API_URL...');
                    try {
                        const parsedUrl = new URL(apiUrl);
                        socketUrl = parsedUrl.origin; // Extracts protocol + host + port, removes path
                    } catch (e) {
                        console.error('❌ Failed to parse API URL, using raw:', e);
                        socketUrl = apiUrl;
                    }
                }

                console.log('🔌 Socket connecting to:', socketUrl);

                // Connect to socket
                newSocket = io(socketUrl, {
                    auth: { token: localStorage.getItem('token') },
                    transports: ['websocket'],
                    reconnection: true,
                    path: '/socket.io/'
                });

                newSocket.on('connect', () => {
                    console.log('✅ Connected to signaling server');
                    setConnectionState('connecting');

                    // Join video room
                    newSocket!.emit('video:join', { sessionId, userRole: 'auto' });
                });

                // ==================== ROLE ASSIGNED ====================
                newSocket.on('video:role-assigned', ({ role }) => {
                    console.log(`👤 Role assigned: ${role.toUpperCase()}`);
                    setUserRole(role);
                });

                // ==================== READY TO CALL (CALLER ONLY) ====================
                newSocket.on('video:ready-to-call', async () => {
                    console.log('🎬 Both users present, creating offer...');

                    try {
                        const pc = createPeerConnection(newSocket!);
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);

                        console.log('📤 Sending offer');
                        newSocket!.emit('video:offer', { sessionId, offer });
                    } catch (error) {
                        console.error('❌ Error creating offer:', error);
                        toast({
                            title: 'Connection Error',
                            description: 'Failed to create offer',
                            variant: 'destructive'
                        });
                    }
                });

                // ==================== OFFER (CALLEE ONLY) ====================
                newSocket.on('video:offer', async ({ offer }) => {
                    console.log('📨 Received offer');

                    try {
                        const pc = createPeerConnection(newSocket!);
                        await pc.setRemoteDescription(new RTCSessionDescription(offer));
                        console.log('✅ Set remote description');

                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);

                        console.log('📤 Sending answer');
                        newSocket!.emit('video:answer', { sessionId, answer });
                    } catch (error) {
                        console.error('❌ Error handling offer:', error);
                        toast({
                            title: 'Connection Error',
                            description: 'Failed to handle offer',
                            variant: 'destructive'
                        });
                    }
                });

                // ==================== ANSWER (CALLER ONLY) ====================
                newSocket.on('video:answer', async ({ answer }) => {
                    console.log('📨 Received answer');

                    try {
                        if (peerConnectionRef.current) {
                            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                            console.log('✅ Set remote description from answer');
                        }
                    } catch (error) {
                        console.error('❌ Error handling answer:', error);
                        toast({
                            title: 'Connection Error',
                            description: 'Failed to handle answer',
                            variant: 'destructive'
                        });
                    }
                });

                // ==================== ICE CANDIDATE ====================
                newSocket.on('video:ice-candidate', async ({ candidate }) => {
                    console.log('🧊 Received ICE candidate');

                    try {
                        if (peerConnectionRef.current) {
                            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                            console.log('✅ Added ICE candidate');
                        }
                    } catch (error) {
                        console.error('❌ Error adding ICE candidate:', error);
                    }
                });

                // ==================== PEER LEFT ====================
                newSocket.on('video:peer-left', () => {
                    console.log('👋 Other user left');
                    setConnectionState('disconnected');
                    toast({
                        title: 'Call Ended',
                        description: 'The other participant left the call'
                    });
                });

                // ==================== ERROR ====================
                newSocket.on('video:error', ({ message }) => {
                    console.error('❌ Video error:', message);
                    toast({
                        title: 'Error',
                        description: message,
                        variant: 'destructive'
                    });
                });

                // ==================== SOCKET ERRORS ====================
                newSocket.on('connect_error', (error) => {
                    console.error('❌ Socket connection error:', error);
                    toast({
                        title: 'Connection Error',
                        description: 'Failed to connect to server',
                        variant: 'destructive'
                    });
                });

                newSocket.on('error', (error) => {
                    console.error('❌ Socket error:', error);
                });

                setSocket(newSocket);

            } catch (error: any) {
                console.error('❌ Initialization error:', error);

                let errorMessage = 'Failed to initialize video call';
                if (error.name === 'NotAllowedError') {
                    errorMessage = 'Camera/microphone access denied. Please allow permissions.';
                } else if (error.name === 'NotFoundError') {
                    errorMessage = 'No camera or microphone found.';
                } else if (error.name === 'NotReadableError') {
                    errorMessage = 'Camera/microphone is already in use.';
                }

                toast({
                    title: 'Initialization Error',
                    description: errorMessage,
                    variant: 'destructive',
                    duration: 6000
                });
            }
        };

        initialize();

        // Cleanup
        return () => {
            console.log('🧹 Cleaning up...');
            localStreamRef.current?.getTracks().forEach(track => track.stop());
            peerConnectionRef.current?.close();
            if (newSocket) {
                newSocket.emit('video:leave', { sessionId });
                newSocket.disconnect();
            }
        };
    }, [sessionId, toast]);

    // ==================== CONTROLS ====================
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
        if (socket) {
            socket.emit('video:leave', { sessionId });
            socket.disconnect();
        }
        navigate(-1);
    };

    // ==================== RENDER ====================
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
                    <div className={`w-3 h-3 rounded-full ${connectionState === 'connected' ? 'bg-green-500' :
                        connectionState === 'connecting' ? 'bg-yellow-500' :
                            'bg-red-500'
                        }`} />
                    <span className="text-gray-400 text-sm">
                        {connectionState === 'connected' ? 'Connected' :
                            connectionState === 'connecting' ? 'Connecting...' :
                                'Disconnected'}
                    </span>
                    {userRole && (
                        <span className="text-gray-400 text-xs bg-gray-700 px-2 py-1 rounded">
                            {userRole === 'caller' ? 'Counsellor' : 'Client'}
                        </span>
                    )}
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
                        {connectionState !== 'connected' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 gap-4">
                                {(connectionState === 'failed' || connectionState === 'disconnected') ? (
                                    <>
                                        <p className="text-red-400 font-medium">Connection Lost</p>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => window.location.reload()}
                                            className="gap-2"
                                        >
                                            <Monitor className="w-4 h-4" />
                                            Retry Connection
                                        </Button>
                                    </>
                                ) : (
                                    <p className="text-white animate-pulse">Waiting for other participant...</p>
                                )}
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
