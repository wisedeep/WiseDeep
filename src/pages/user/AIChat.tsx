import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Calendar, MessageSquare, NotebookPen, TrendingUp, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

import { default as api } from "@/lib/auth";

const AIChat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content: "Namaste! I am your AI spiritual counsellor, trained in the wisdom of the Bhagavad Gita, Vedas, Quran, Bible, and modern psychology. How may I guide you today?",
      timestamp: "10:30 AM",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const navItems = [
    { icon: <TrendingUp className="w-5 h-5" />, label: "Dashboard", path: "/dashboard" },
    { icon: <BookOpen className="w-5 h-5" />, label: "Courses", path: "/courses" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "AI Chat", path: "/ai-chat" },
    { icon: <Calendar className="w-5 h-5" />, label: "Book Session", path: "/book-session" },
    { icon: <NotebookPen className="w-5 h-5" />, label: "My Notes", path: "/notes" },
    { icon: <Calendar className="w-5 h-5" />, label: "My Sessions", path: "/my-sessions" },
  ];

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const newUserMessage = {
      role: "user",
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newUserMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await api.post('/user/ai-chat', { message });
      const data = response.data;


      const aiResponse = {
        role: "ai",
        content: data.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems} userRole="User">
      <div className="h-[calc(100vh-12rem)] flex flex-col animate-fade-in">
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-2">AI Spiritual Counsellor</h1>
          <p className="text-muted-foreground">Available 24/7 for guidance and support</p>
        </div>

        <Card className="flex-1 flex flex-col shadow-medium">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-saffron flex items-center justify-center animate-glow">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-semibold">AI Counsellor</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Trained in ancient scriptures & modern psychology
                  </div>
                </div>
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-muted-foreground">Online</span>
              </div>
            </div>
          </CardHeader>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${msg.role === "user"
                        ? "bg-gradient-saffron text-primary-foreground"
                        : "bg-secondary"
                      }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p
                      className={`text-xs mt-2 ${msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                    >
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="max-w-[80%] rounded-2xl p-4 bg-secondary">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <p className="text-xs text-muted-foreground">AI is thinking...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <CardContent className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Share what's on your mind..."
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                className="bg-gradient-saffron hover:shadow-glow transition-smooth"
                disabled={isLoading || !message.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Your conversations are private and secure
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AIChat;
