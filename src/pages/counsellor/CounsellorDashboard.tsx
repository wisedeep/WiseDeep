import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Calendar, Users, Settings, TrendingUp, Clock, Video, Loader2, MessageCircle } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { default as api } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

interface CounsellorData {
  name: string;
  specialization: string;
  rating: number;
  totalReviews: number;
}

interface StatsData {
  totalSessions: number;
  thisMonth: number;
  activeClients: number;
}

interface Session {
  _id?: string;
  client: string;
  time: string;
  type: string;
  status: string;
}

const CounsellorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [counsellorData, setCounsellorData] = useState<CounsellorData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", path: "/counsellor/dashboard" },
    { icon: <Calendar className="w-5 h-5" />, label: "Schedule", path: "/counsellor/schedule" },
    { icon: <Users className="w-5 h-5" />, label: "My Clients", path: "/counsellor/clients" },
    { icon: <MessageCircle className="w-5 h-5" />, label: "Messages", path: "/counsellor/messages" },
    { icon: <Settings className="w-5 h-5" />, label: "Settings", path: "/counsellor/settings" },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/counsellor/dashboard');
        const data = response.data;
        setCounsellorData(data.counsellor);
        setStats(data.stats);

        // Fetch upcoming sessions
        const sessionsResponse = await api.get('/counsellor/sessions/upcoming');
        setUpcomingSessions(sessionsResponse.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Fallback to hardcoded data if API fails
        setCounsellorData({
          name: user?.firstName ? `${user.firstName} ${user.lastName}` : "Dr. Counsellor",
          specialization: "Clinical Psychology",
          rating: 4.9,
          totalReviews: 320,
        });
        setStats({
          totalSessions: 1250,
          thisMonth: 42,
          activeClients: 28,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <DashboardLayout navItems={navItems} userRole="Counsellor">
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="bg-gradient-saffron rounded-2xl p-8 text-primary-foreground shadow-medium">
          <h1 className="text-3xl font-bold mb-2">
            Welcome, {counsellorData?.name || "Dr. Counsellor"}!
          </h1>
          <p className="text-primary-foreground/90">
            You have {upcomingSessions.length} sessions scheduled today
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sessions
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (stats?.totalSessions || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Lifetime</p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Month
              </CardTitle>
              <Calendar className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">42</div>
              <p className="text-xs text-muted-foreground mt-1">+8 from last month</p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Clients
              </CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.activeClients || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Current active</p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rating
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (counsellorData?.rating || 0).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Based on {counsellorData?.totalReviews || 0} reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map((session, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-saffron flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-foreground">
                        {session.client ? session.client.split(" ").map((n) => n[0]).join("") : "U"}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold">{session.client || "unknown client"}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{session.time ? session.time.split(" - ")[0] : "Time N/A"}</span>
                        <span>•</span>
                        <span>{session.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={session.status === 'confirmed' ? 'default' : 'secondary'}>
                      {session.status}
                    </Badge>
                    <Button size="sm" onClick={() => navigate(`/video-call/${session._id}`)}>
                      <Video className="w-4 h-4 mr-2" />
                      Start Session
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No sessions scheduled for today</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover-lift cursor-pointer" onClick={() => navigate('/counsellor/schedule')}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-saffron flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Manage Schedule</h3>
                  <p className="text-sm text-muted-foreground">Set your availability and time slots</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift cursor-pointer" onClick={() => navigate('/counsellor/clients')}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">View Clients</h3>
                  <p className="text-sm text-muted-foreground">Access client profiles and history</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CounsellorDashboard;
