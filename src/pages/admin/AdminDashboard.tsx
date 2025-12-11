import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Upload, UserCheck, Users, BookOpen, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { default as api } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", path: "/admin/dashboard" },
    { icon: <Upload className="w-5 h-5" />, label: "Manage Courses", path: "/admin/courses" },
    { icon: <UserCheck className="w-5 h-5" />, label: "Counsellor Approvals", path: "/admin/approvals" },
    { icon: <Users className="w-5 h-5" />, label: "User Management", path: "/admin/users" },
    { icon: <Calendar className="w-5 h-5" />, label: "All Sessions", path: "/admin/sessions" },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsResponse, approvalsResponse] = await Promise.all([
          api.get('/admin/dashboard-stats'),
          api.get('/admin/pending-approvals')
        ]);

        setStats(statsResponse.data);
        setPendingApprovals(approvalsResponse.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setStats(null);
        setPendingApprovals([]);
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  return (
    <DashboardLayout navItems={navItems} userRole="Admin">
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="bg-gradient-saffron rounded-2xl p-8 text-primary-foreground shadow-medium">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-primary-foreground/90">Manage platform operations and quality</p>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (stats?.totalUsers || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">+{stats?.newUsersThisMonth || 0} this month</p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Counsellors
              </CardTitle>
              <UserCheck className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (stats?.activeCounsellors || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stats?.pendingCounsellors || 0} pending approval</p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Courses
              </CardTitle>
              <BookOpen className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (stats?.totalCourses || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Published courses</p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sessions Today
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (stats?.sessionsToday || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across all counsellors</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Counsellor Approvals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending Counsellor Approvals</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/approvals')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading pending approvals...</div>
            ) : pendingApprovals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No pending approvals</div>
            ) : (
              pendingApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-saffron flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-foreground">
                        {approval.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold">{approval.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {approval.specialization} • {approval.experience}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Applied on {approval.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-gradient-saffron" onClick={() => navigate('/admin/approvals')}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/admin/approvals')}>Review</Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => navigate('/admin/approvals')}>Reject</Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover-lift cursor-pointer" onClick={() => navigate('/admin/courses')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/courses'); } }} role="button" tabIndex={0}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-saffron flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Upload Course</h3>
                  <p className="text-sm text-muted-foreground">Add new learning content</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift cursor-pointer" onClick={() => navigate('/admin/approvals')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/approvals'); } }} role="button" tabIndex={0}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Review Applications</h3>
                  <p className="text-sm text-muted-foreground">Approve new counsellors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift cursor-pointer" onClick={() => navigate('/admin/users')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/users'); } }} role="button" tabIndex={0}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-glow to-accent flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Manage Users</h3>
                  <p className="text-sm text-muted-foreground">View all platform users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
