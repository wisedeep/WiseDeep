import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Calendar, MessageSquare, NotebookPen, TrendingUp, Award, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import io, { Socket } from 'socket.io-client';
import { useAuth } from "@/components/AuthContext";
import { useEffect, useState } from "react";
import { default as api } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { JSX } from "react/jsx-runtime";

interface DashboardData {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  stats: {
    enrolledCourses: number;
    notes: number;
    completedSessions: number;
  };
}

interface Session {
  _id: string;
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
  duration: number;
  status: string;
}

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Socket.io connection for real-time session notifications
  useEffect(() => {
    const token = localStorage.getItem('token');
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to notification socket');
    });

    // Listen for session start notifications
    newSocket.on('session-started', (data: { sessionId: string; counsellorName: string }) => {
      console.log('Session started notification:', data);
      toast({
        title: "Session Started!",
        description: `${data.counsellorName} has started your session. Click to join!`,
        action: (
          <Button
            size="sm"
            onClick={() => navigate(`/video-call/${data.sessionId}`)}
            className="bg-gradient-saffron"
          >
            Join Now
          </Button>
        ),
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [navigate, toast]);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/user/profile');
      const userData = response.data;

      // Get enrolled courses count
      const coursesResponse = await api.get('/user/courses');
      console.log('All courses:', coursesResponse.data);
      console.log('Current user:', user);
      console.log('User ID:', user?.id);

      const enrolled = coursesResponse.data.filter((course: any) => {
        console.log('Course:', course.title, 'enrolledUsers:', course.enrolledUsers);
        // Convert both to strings and compare - use user.id
        const enrolledUserIds = (course.enrolledUsers || []).map((id: any) => String(id));
        const currentUserId = String(user?.id);
        const isEnrolled = enrolledUserIds.includes(currentUserId);
        console.log('Is enrolled?', isEnrolled, 'Looking for:', currentUserId, 'In:', enrolledUserIds);
        return isEnrolled;
      });

      console.log('Enrolled courses:', enrolled);
      const enrolledCoursesCount = enrolled.length;
      setEnrolledCourses(enrolled); // Show all enrolled courses

      // Get notes count
      const notesResponse = await api.get('/user/notes');

      // Get sessions count
      const sessionsResponse = await api.get('/user/sessions');
      const completedSessionsCount = sessionsResponse.data.filter((session: any) =>
        session.status === 'completed'
      ).length;

      setDashboardData({
        user: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
        },
        stats: {
          enrolledCourses: enrolledCoursesCount,
          notes: notesResponse.data.length,
          completedSessions: completedSessionsCount,
        },
      });

      // Get upcoming sessions
      const today = new Date();
      const upcoming = sessionsResponse.data
        .filter((session: any) => {
          const sessionDate = new Date(session.date);
          return sessionDate >= today && session.status !== 'completed' && session.status !== 'cancelled';
        })
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3); // Show only next 3 sessions

      setUpcomingSessions(upcoming);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { icon: <TrendingUp className="w-5 h-5" />, label: "Dashboard", path: "/dashboard" },
    { icon: <BookOpen className="w-5 h-5" />, label: "Courses", path: "/courses" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "AI Chat", path: "/ai-chat" },
    { icon: <Calendar className="w-5 h-5" />, label: "Book Session", path: "/book-session" },
    { icon: <NotebookPen className="w-5 h-5" />, label: "My Notes", path: "/notes" },
    { icon: <Calendar className="w-5 h-5" />, label: "My Sessions", path: "/my-sessions" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "Messages", path: "/messages" },
    { icon: <User className="w-5 h-5" />, label: "Profile", path: "/profile" },
  ];

  return (
    <DashboardLayout navItems={navItems} userRole="User">
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="bg-gradient-saffron rounded-2xl p-8 text-primary-foreground shadow-medium">
          <h1 className="text-3xl font-bold mb-2">
            Welcome Back, {dashboardData?.user.firstName || 'User'}!
          </h1>
          <p className="text-primary-foreground/90">Continue your journey to inner peace and mental wellness</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Courses Completed
              </CardTitle>
              <BookOpen className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{dashboardData?.stats.enrolledCourses || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Enrolled courses</p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sessions Attended
              </CardTitle>
              <Calendar className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{dashboardData?.stats.completedSessions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {upcomingSessions.length > 0
                  ? `Next session: ${upcomingSessions[0].date === new Date().toISOString().split('T')[0] ? 'Today' : 'Soon'}`
                  : 'No upcoming sessions'}
              </p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Notes Created
              </CardTitle>
              <Award className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{dashboardData?.stats.notes || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Personal reflections</p>
            </CardContent>
          </Card>
        </div>

        {/* Current Courses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Continue Learning</CardTitle>
              {enrolledCourses.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {enrolledCourses.length} {enrolledCourses.length === 1 ? 'course' : 'courses'}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {enrolledCourses.length > 0 ? (
              <div className="space-y-3">
                {enrolledCourses.map((course) => (
                  <div key={course._id} className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{course.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {course.modules?.length || 0} modules
                      </p>
                      <Progress value={0} className="h-2" />
                    </div>
                    <Button
                      size="sm"
                      className="ml-4"
                      onClick={() => navigate(`/courses/${course._id}`)}
                    >
                      Continue
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Enrolled Courses</h3>
                <p className="text-muted-foreground mb-4">Start your learning journey today</p>
                <Button onClick={() => navigate('/courses')} className="bg-gradient-saffron">
                  Browse Courses
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover-lift cursor-pointer" onClick={() => navigate("/ai-chat")}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-saffron flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">AI Spiritual Counsellor</h3>
                  <p className="text-sm text-muted-foreground">Get instant guidance 24/7</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift cursor-pointer" onClick={() => navigate("/book-session")}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Book a Session</h3>
                  <p className="text-sm text-muted-foreground">Connect with expert counsellors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length > 0 ? (
              <div className="space-y-4">
                {upcomingSessions.map((session) => {
                  const sessionDate = new Date(session.date);
                  const today = new Date();
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);

                  let dateText = sessionDate.toLocaleDateString();
                  if (sessionDate.toDateString() === today.toDateString()) {
                    dateText = 'Today';
                  } else if (sessionDate.toDateString() === tomorrow.toDateString()) {
                    dateText = 'Tomorrow';
                  }

                  const initials = `${session.counsellor.user.firstName[0]}${session.counsellor.user.lastName[0]}`;

                  return (
                    <div key={session._id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-saffron flex items-center justify-center">
                          <span className="text-sm font-bold text-primary-foreground">{initials}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold">
                            {session.counsellor.user.firstName} {session.counsellor.user.lastName}
                          </h4>
                          <p className="text-sm text-muted-foreground">{session.counsellor.specialization}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {dateText}, {session.startTime} - {session.endTime}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigate('/my-sessions')}>
                        View Details
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Sessions</h3>
                <p className="text-muted-foreground mb-4">Book a session with our expert counsellors</p>
                <Button onClick={() => navigate('/book-session')} className="bg-gradient-saffron">
                  Book a Session
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserDashboard;
function toast(arg0: { title: string; description: string; action: JSX.Element; }) {
  throw new Error("Function not implemented.");
}

