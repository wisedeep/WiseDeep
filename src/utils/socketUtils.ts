import { io, Socket } from "socket.io-client";

let clientSocket: Socket | null = null;

export const initializeClientSocket = (): Socket | null => {
    if (typeof window !== 'undefined' && !clientSocket) {
        let socketUrl = 'http://localhost:5000';

        try {
            // @ts-ignore
            if (import.meta.env && import.meta.env.VITE_API_URL) {
                // @ts-ignore
                socketUrl = import.meta.env.VITE_API_URL.replace('/api', '');
            } else if (window.location.host.includes('localhost')) {
                socketUrl = 'http://localhost:5000';
            } else {
                socketUrl = window.location.origin;
            }
        } catch (e) {
            socketUrl = 'http://localhost:5000';
        }

        const token = localStorage.getItem('token');
        if (token) {
            clientSocket = io(socketUrl, {
                auth: {
                    token: token
                },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                timeout: 10000
            });

            clientSocket.on("connect_error", (err) => {
                console.error("Socket connection error:", err.message);
            });

            clientSocket.on("connect", () => {
                console.log("Socket connected successfully:", clientSocket?.id);
            });
        }
    }
    return clientSocket;
};

export const getClientSocket = () => {
    return clientSocket;
};

export const disconnectClientSocket = () => {
    if (clientSocket) {
        clientSocket.disconnect();
        clientSocket = null;
    }
};
