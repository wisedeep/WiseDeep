import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Upload, UserCheck, Users, BookOpen, Calendar, Search, Video, Clock, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { default as api } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Session {
  _id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  counsellor: {
    user: {
      firstName: string;
      lastName: string;
    };
    specialization: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
}

const AdminSessions = () => {
  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", path: "/admin/dashboard" },
    { icon: <Upload className="w-5 h-5" />, label: "Manage Courses", path: "/admin/courses" },
    { icon: <UserCheck className="w-5 h-5" />, label: "Counsellor Approvals", path: "/admin/approvals" },
    { icon: <Users className="w-5 h-5" />, label: "User Management", path: "/admin/users" },
    { icon: <Calendar className="w-5 h-5" />, label: "All Sessions", path: "/admin/sessions" },
  ];

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/admin/sessions');
      setSessions(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to combine date and time properly
  const combineDateTime = (dateStr: string, timeStr: string): Date => {
    const date = new Date(dateStr);
    // Parse time like "10:00 AM" or "03:00 PM"
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeMatch) {
      console.error(`Invalid time format: ${timeStr}`);
      return date; // fallback
    }

    const [, hours, minutes, period] = timeMatch;
    let hour24 = parseInt(hours, 10);
    if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
    if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;

    date.setHours(hour24, parseInt(minutes, 10), 0, 0);
    return date;
  };

  const upcomingSessions = sessions.filter(session => {
    const sessionDateTime = combineDateTime(session.date, session.startTime);
    return session.status === 'scheduled' && sessionDateTime > new Date();
  });

  const pastSessions = sessions.filter(session => {
    const sessionDateTime = combineDateTime(session.date, session.startTime);
    return session.status === 'completed' || sessionDateTime <= new Date();
  });

  const filteredUpcomingSessions = upcomingSessions.filter(session =>
    `${session.user.firstName} ${session.user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${session.counsellor.user.firstName} ${session.counsellor.user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.counsellor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPastSessions = pastSessions.filter(session =>
    `${session.user.firstName} ${session.user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${session.counsellor.user.firstName} ${session.counsellor.user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.counsellor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <DashboardLayout navItems={navItems} userRole="Admin">
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">All Sessions</h1>
            <p className="text-muted-foreground">Monitor all counselling sessions on the platform</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search sessions by user, counsellor, or specialization..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{sessions.length}</p>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pastSessions.filter(s => s.status === 'completed').length}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingSessions.length}</p>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Live Now</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="upcoming">Upcoming Sessions</TabsTrigger>
            <TabsTrigger value="past">Past Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4 mt-6">
            {filteredUpcomingSessions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No upcoming sessions</h3>
                <p className="text-muted-foreground">All sessions are either completed or cancelled.</p>
              </div>
            ) : (
              filteredUpcomingSessions.map((session) => (
                <Card key={session._id} className="hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-saffron flex items-center justify-center">
                          <span className="text-sm font-bold text-primary-foreground">
                            {session.user.firstName?.[0]}{session.user.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{session.user.firstName} {session.user.lastName}</h3>
                          <p className="text-sm text-muted-foreground">with {session.counsellor.user.firstName} {session.counsellor.user.lastName}</p>
                          <p className="text-xs text-muted-foreground">{session.counsellor.specialization}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getStatusBadgeVariant(session.status)}>
                            {session.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{session.date}</p>
                        <p className="text-sm text-muted-foreground">{session.startTime} - {session.endTime}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-6">
            {filteredPastSessions.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No past sessions</h3>
                <p className="text-muted-foreground">Sessions will appear here once they are completed.</p>
              </div>
            ) : (
              filteredPastSessions.map((session) => (
                <Card key={session._id} className="hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{session.user.firstName} {session.user.lastName}</h3>
                          <p className="text-sm text-muted-foreground">with {session.counsellor.user.firstName} {session.counsellor.user.lastName}</p>
                          <p className="text-xs text-muted-foreground">{session.counsellor.specialization}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusBadgeVariant(session.status)}>
                          {session.status === 'completed' ? 'Completed' : 'Past'}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">{session.date}</p>
                        <p className="text-sm text-muted-foreground">{session.startTime} - {session.endTime}</p>
                      </div>
                    </div>
                    {session.notes && (
                      <div className="mt-4 bg-secondary rounded-lg p-4">
                        <p className="text-sm font-medium mb-1">Session Notes:</p>
                        <p className="text-sm text-muted-foreground">{session.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminSessions;