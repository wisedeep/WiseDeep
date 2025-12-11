import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Upload, UserCheck, Users, BookOpen, Calendar, Mail, Clock, Award } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { default as api } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Counsellor {
  _id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  specialization: string;
  experience: string;
  isApproved: boolean;
  createdAt: string;
}

const AdminApprovals = () => {
  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", path: "/admin/dashboard" },
    { icon: <Upload className="w-5 h-5" />, label: "Manage Courses", path: "/admin/courses" },
    { icon: <UserCheck className="w-5 h-5" />, label: "Counsellor Approvals", path: "/admin/approvals" },
    { icon: <Users className="w-5 h-5" />, label: "User Management", path: "/admin/users" },
    { icon: <Calendar className="w-5 h-5" />, label: "All Sessions", path: "/admin/sessions" },
  ];

  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchCounsellors();
  }, []);

  const fetchCounsellors = async () => {
    try {
      const response = await api.get('/admin/counsellors');
      setCounsellors(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load counsellors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (counsellorId: string) => {
    try {
      await api.put(`/admin/counsellors/${counsellorId}/approve`, {});
      toast({
        title: "Success",
        description: "Counsellor approved successfully",
      });
      setCounsellors(counsellors.map(c => c._id === counsellorId ? { ...c, isApproved: true } : c));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve counsellor",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (counsellorId: string) => {
    if (window.confirm("Are you sure you want to reject this counsellor application?")) {
      try {
        await api.put(`/admin/counsellors/${counsellorId}/reject`, {});

        toast({
          title: "Success",
          description: "Counsellor application rejected",
        });
        setCounsellors(counsellors.filter(c => c._id !== counsellorId));
      } catch (error) {
        console.error('Error rejecting counsellor:', error);
        toast({
          title: "Error",
          description: "Failed to reject counsellor",
          variant: "destructive",
        });
      }
    }
  };

  const pendingCounsellors = counsellors.filter(c => !c.isApproved);
  const approvedCounsellors = counsellors.filter(c => c.isApproved);

  return (
    <DashboardLayout navItems={navItems} userRole="Admin">
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Counsellor Approvals</h1>
            <p className="text-muted-foreground">Review and approve counsellor applications</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCounsellors.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{approvedCounsellors.length}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counsellors.length}</p>
                  <p className="text-sm text-muted-foreground">Total Applications</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Applications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingCounsellors.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending applications</h3>
                <p className="text-muted-foreground">All applications have been reviewed.</p>
              </div>
            ) : (
              pendingCounsellors.map((counsellor) => (
                <div key={counsellor._id} className="flex items-center justify-between p-6 bg-secondary rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-saffron flex items-center justify-center">
                      <span className="text-lg font-bold text-primary-foreground">
                        {counsellor.user.firstName?.[0]}{counsellor.user.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{counsellor.user.firstName} {counsellor.user.lastName}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {counsellor.user.email}
                        </span>
                        <span>Applied {new Date(counsellor.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline">{counsellor.specialization}</Badge>
                        <Badge variant="secondary">{counsellor.experience} experience</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="bg-gradient-saffron"
                      onClick={() => handleApprove(counsellor._id)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleReject(counsellor._id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Approved Counsellors */}
        <Card>
          <CardHeader>
            <CardTitle>Approved Counsellors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {approvedCounsellors.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No approved counsellors yet</h3>
                <p className="text-muted-foreground">Approved counsellors will appear here.</p>
              </div>
            ) : (
              approvedCounsellors.map((counsellor) => (
                <div key={counsellor._id} className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {counsellor.user.firstName?.[0]}{counsellor.user.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold">{counsellor.user.firstName} {counsellor.user.lastName}</h4>
                      <p className="text-sm text-muted-foreground">{counsellor.specialization}</p>
                      <Badge variant="default" className="mt-1">Approved</Badge>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Approved on</p>
                    <p>{new Date(counsellor.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminApprovals;