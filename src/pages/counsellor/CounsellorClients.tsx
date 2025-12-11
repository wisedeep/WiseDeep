import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Calendar, MessageCircle, Search, Settings, X, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { default as api } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  email: string;
  lastSession: string;
  totalSessions: number;
  status: string;
}

const CounsellorClients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isConversationDialogOpen, setIsConversationDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState([]);

  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", path: "/counsellor/dashboard" },
    { icon: <Calendar className="w-5 h-5" />, label: "Schedule", path: "/counsellor/schedule" },
    { icon: <Users className="w-5 h-5" />, label: "My Clients", path: "/counsellor/clients" },
    { icon: <MessageCircle className="w-5 h-5" />, label: "Messages", path: "/counsellor/messages" },
    { icon: <Settings className="w-5 h-5" />, label: "Settings", path: "/counsellor/settings" },
  ];

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await api.get('/counsellor/clients');
        setClients(response.data);
        setFilteredClients(response.data);
      } catch (error) {
        // console.error('Error fetching clients:', error);
        toast({
          title: "Error",
          description: "Failed to load clients. Please refresh the page.",
          variant: "destructive",
        });
        setClients([]);
        setFilteredClients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [toast]);

  useEffect(() => {
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewProfile = (client: Client) => {
    setSelectedClient(client);
    setIsProfileDialogOpen(true);
  };

  const handleMessage = (client: Client) => {
    setSelectedClient(client);
    setMessage("");
    setIsMessageDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedClient) return;

    try {
      await api.post('/counsellor/messages/send', {
        receiverId: selectedClient.id,
        content: message
      });
      toast({
        title: "Message Sent",
        description: `Your message to ${selectedClient.name} has been sent successfully.`,
      });
      setIsMessageDialogOpen(false);
      setMessage("");
      // Refresh conversation if open
      if (isConversationDialogOpen) {
        fetchConversation(selectedClient.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchConversation = async (clientId: string) => {
    try {
      const response = await api.get(`/counsellor/messages/${clientId}`);
      setConversation(response.data);
      // Mark messages as read
      await api.put(`/counsellor/messages/${clientId}/read`);
    } catch (error) {
      // console.error('Error fetching conversation:', error);
    }
  };

  const openConversation = async (client: Client) => {
    setSelectedClient(client);
    await fetchConversation(client.id);
    setIsConversationDialogOpen(true);
    setNewMessage("");
  };

  const handleSendNewMessage = async () => {
    if (!newMessage.trim() || !selectedClient) return;

    try {
      await api.post('/counsellor/messages/send', {
        receiverId: selectedClient.id,
        content: newMessage
      });
      setNewMessage("");
      await fetchConversation(selectedClient.id);
      toast({
        title: "Message Sent",
        description: "Your message has been sent.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartSession = async (clientId: string) => {
    // For now, we'll navigate to a video session with a generated session ID
    // In a real app, you'd create a session record first
    const sessionId = `session_${Date.now()}_${clientId}`;
    // console.log('Starting session:', sessionId);
    // You could add video session logic here
  };

  return (
    <DashboardLayout navItems={navItems} userRole="Counsellor">
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Clients</h1>
            <p className="text-muted-foreground">Manage your client relationships and sessions</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Clients Grid */}
        {loading ? (
          <div className="text-center py-8">Loading clients...</div>
        ) : filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover-lift">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-full bg-gradient-saffron flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-foreground">
                        {client.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    {getStatusBadge(client.status)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {client.email}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Last Session</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(client.lastSession)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Sessions</p>
                      <p className="font-medium">{client.totalSessions}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleMessage(client)}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-gradient-saffron"
                      onClick={() => handleViewProfile(client)}
                    >
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No clients found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "No clients match your search." : "You haven't had any clients yet."}
            </p>
          </div>
        )}

        {/* Message Dialog */}
        <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Message to {selectedClient?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full p-3 border rounded-md min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendMessage} disabled={!message.trim()}>
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Profile Dialog */}
        <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Client Profile</DialogTitle>
            </DialogHeader>
            {selectedClient && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-saffron flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-foreground">
                      {selectedClient.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedClient.name}</h3>
                    <p className="text-muted-foreground">{selectedClient.email}</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  {getStatusBadge(selectedClient.status)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{selectedClient.totalSessions}</p>
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-lg font-bold">{formatDate(selectedClient.lastSession)}</p>
                    <p className="text-sm text-muted-foreground">Last Session</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold">{clients.length}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Clients</p>
                  <p className="text-2xl font-bold">
                    {clients.filter(c => c.status === 'active').length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">
                    {clients.reduce((sum, client) => sum + client.totalSessions, 0)}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CounsellorClients;
