import { io, Socket } from 'socket.io-client';

class WebRTCClient {
  private socket: Socket;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();
  private roomId: string | null = null;

  constructor() {
    this.socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5001', {
      auth: {
        token: localStorage.getItem('token')
      },
      autoConnect: false
    });

    this.setupEventListeners();
  }

  connect() {
    this.socket.connect();
  }

  disconnect() {
    this.leaveRoom();
    this.socket.disconnect();
  }

  async joinRoom(roomId: string, options: any = {}) {
    this.roomId = roomId;

    try {
      // Initialize WebRTC
      await this.initializeWebRTC();

      // Join the room
      return new Promise((resolve, reject) => {
        this.socket.emit('join-room', { roomId, userType: options.userType || 'client', userId: options.userId }, (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  leaveRoom() {
    if (this.roomId) {
      this.socket.emit('leave-room', { roomId: this.roomId });
      this.roomId = null;
    }

    // Clean up WebRTC
    this.cleanup();
  }

  private async initializeWebRTC() {
    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
        // Add your TURN servers here
      ]
    });

    // Set up event handlers
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          to: this.roomId, // Or specific peer ID
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        // Handle new remote stream
        const userId = ''; // You'll need to track which user this stream belongs to
        this.remoteStreams.set(userId, stream);
        // Emit event or update state
      }
    };

    // Get local media
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  private setupEventListeners() {
    // Handle incoming WebRTC events
    this.socket.on('offer', this.handleOffer);
    this.socket.on('answer', this.handleAnswer);
    this.socket.on('ice-candidate', this.handleICECandidate);

    // Handle room events
    this.socket.on('user-joined', this.handleUserJoined);
    this.socket.on('user-left', this.handleUserLeft);
    this.socket.on('room-info', this.handleRoomInfo);
    this.socket.on('receive-message', this.handleChatMessage);
  }

  // Implement event handlers...
  private handleOffer = async (data: any) => {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit('answer', {
        to: data.from,
        answer: this.peerConnection.localDescription
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  private handleAnswer = async (data: any) => {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  private handleICECandidate = async (data: any) => {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  private handleUserJoined = (data: any) => {
    console.log('User joined:', data);
  };

  private handleUserLeft = (data: any) => {
    console.log('User left:', data);
  };

  private handleRoomInfo = (data: any) => {
    console.log('Room info:', data);
  };

  private handleChatMessage = (data: any) => {
    console.log('Chat message:', data);
  };

  private cleanup() {
    // Clean up WebRTC resources
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Clear remote streams
    this.remoteStreams.clear();
  }
}

export const webRTCClient = new WebRTCClient();