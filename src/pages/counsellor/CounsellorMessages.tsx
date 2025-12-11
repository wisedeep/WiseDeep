import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, LayoutDashboard, Calendar, Users, Settings, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { default as api } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import io from 'socket.io-client';

interface Client {
    id: string;
    name: string;
    email: string;
}

interface Message {
    _id: string;
    sender: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    receiver: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    content: string;
    sentAt: string;
    read: boolean;
}

interface Conversation {
    client: Client;
    latestMessage: Message | null;
    unreadCount: number;
}

const CounsellorMessages = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showMobileConversations, setShowMobileConversations] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const navItems = [
        { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", path: "/counsellor/dashboard" },
        { icon: <Calendar className="w-5 h-5" />, label: "Schedule", path: "/counsellor/schedule" },
        { icon: <Users className="w-5 h-5" />, label: "My Clients", path: "/counsellor/clients" },
        { icon: <MessageCircle className="w-5 h-5" />, label: "Messages", path: "/counsellor/messages" },
        { icon: <Settings className="w-5 h-5" />, label: "Settings", path: "/counsellor/settings" },
    ];



    // Ref to track selected client ID for socket callback
    const selectedClientIdRef = useRef<string | null>(null);

    useEffect(() => {
        selectedClientIdRef.current = selectedClient?.id || null;
    }, [selectedClient]);

    useEffect(() => {
        if (!user) return;

        fetchConversations();

        // Setup socket connection
        const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            auth: { token: localStorage.getItem('token') }
        });

        newSocket.on('connect', () => {
            console.log('Connected to message socket');
            newSocket.emit('register-counsellor', user.id);
        });

        // Listen for incoming messages
        newSocket.on('receive-message', (message: Message) => {
            console.log('Received message:', message);
            const currentSelectedId = selectedClientIdRef.current;

            // Only add message if it belongs to current conversation
            if (currentSelectedId && (message.sender._id === currentSelectedId || message.receiver._id === currentSelectedId)) {
                setMessages(prev => [...prev, message]);
            }
            // Update conversations list to show new message preview
            fetchConversations();
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchConversations = async () => {
        try {
            const response = await api.get('/counsellor/conversations');
            setConversations(response.data);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load conversations",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (clientId: string) => {
        try {
            const response = await api.get(`/counsellor/messages/${clientId}`);
            setMessages(response.data);
            // Update unread count in conversations
            setConversations(prev => prev.map(conv =>
                conv.client.id === clientId ? { ...conv, unreadCount: 0 } : conv
            ));
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load messages",
                variant: "destructive",
            });
        }
    };

    const handleSelectClient = (client: Client) => {
        setSelectedClient(client);
        fetchMessages(client.id);
        setShowMobileConversations(false); // Hide conversations on mobile
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedClient || sending) return;

        setSending(true);
        try {
            await api.post('/counsellor/messages/send', {
                receiverId: selectedClient.id,
                content: newMessage
            });
            setNewMessage("");
            await fetchMessages(selectedClient.id);
            await fetchConversations();
            toast({
                title: "Message Sent",
                description: "Your message has been sent successfully.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to send message. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    return (
        <DashboardLayout navItems={navItems} userRole="Counsellor">
            <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Messages</h1>
                    <p className="text-muted-foreground">Chat with your clients</p>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 overflow-hidden">
                    {/* Conversations List */}
                    <Card className={`md:col-span-1 flex flex-col ${!showMobileConversations ? 'hidden md:flex' : ''}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5" />
                                Conversations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto space-y-2">
                            {loading ? (
                                <p className="text-center text-muted-foreground py-8">Loading...</p>
                            ) : conversations.length === 0 ? (
                                <div className="text-center py-8">
                                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-muted-foreground">No conversations yet</p>
                                    <p className="text-sm text-muted-foreground">Your clients will appear here</p>
                                </div>
                            ) : (
                                conversations.map((conv) => (
                                    <div
                                        key={conv.client.id}
                                        onClick={() => handleSelectClient(conv.client)}
                                        className={`p-4 rounded-lg cursor-pointer transition-all hover:bg-muted ${selectedClient?.id === conv.client.id ? 'bg-muted border-2 border-primary' : 'border border-border'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="w-10 h-10 rounded-full bg-gradient-saffron flex items-center justify-center flex-shrink-0">
                                                    <span className="text-sm font-bold text-primary-foreground">
                                                        {conv.client.name.split(' ').map(n => n[0]).join('')}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold truncate">{conv.client.name}</h3>
                                                    <p className="text-xs text-muted-foreground truncate">{conv.client.email}</p>
                                                    {conv.latestMessage && (
                                                        <p className="text-sm text-muted-foreground truncate mt-1">
                                                            {conv.latestMessage.content}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {conv.unreadCount > 0 && (
                                                <Badge className="bg-red-500 text-white">{conv.unreadCount}</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Message Thread */}
                    <Card className={`md:col-span-2 flex flex-col ${showMobileConversations ? 'hidden md:flex' : ''}`}>
                        {selectedClient ? (
                            <>
                                <CardHeader className="border-b">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="md:hidden"
                                            onClick={() => setShowMobileConversations(true)}
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </Button>
                                        <div className="w-10 h-10 rounded-full bg-gradient-saffron flex items-center justify-center">
                                            <span className="text-sm font-bold text-primary-foreground">
                                                {selectedClient.name.split(' ').map(n => n[0]).join('')}
                                            </span>
                                        </div>
                                        <div>
                                            <CardTitle>{selectedClient.name}</CardTitle>
                                            <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-scroll p-6 space-y-4 custom-scrollbar max-h-[calc(100vh-24rem)] min-h-0">
                                    {messages.length === 0 ? (
                                        <div className="text-center py-12">
                                            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-muted-foreground">No messages yet</p>
                                            <p className="text-sm text-muted-foreground">Start the conversation!</p>
                                        </div>
                                    ) : (
                                        messages.map((message, index) => {
                                            const isOwnMessage = message.sender._id === user?.id;
                                            const showDate = index === 0 || formatDate(messages[index - 1].sentAt) !== formatDate(message.sentAt);

                                            return (
                                                <div key={message._id}>
                                                    {showDate && (
                                                        <div className="text-center my-4">
                                                            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                                                {formatDate(message.sentAt)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                                                            <div
                                                                className={`p-3 rounded-lg ${isOwnMessage
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'bg-muted'
                                                                    }`}
                                                            >
                                                                <p className="text-sm">{message.content}</p>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-1 px-1">
                                                                {formatTime(message.sentAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </CardContent>
                                <div className="p-4 border-t">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Type your message..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                            disabled={sending}
                                        />
                                        <Button
                                            onClick={handleSendMessage}
                                            disabled={!newMessage.trim() || sending}
                                            className="bg-gradient-saffron"
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <CardContent className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                                    <p className="text-muted-foreground">Choose a client to start messaging</p>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default CounsellorMessages;
