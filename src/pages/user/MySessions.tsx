import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Calendar as CalendarIcon, MessageSquare, NotebookPen, TrendingUp, Video, Clock, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../../components/AuthContext";
import { default as api } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Session {
  _id: string;
  counsellor?: {
    _id?: string;
    user?: {
      firstName?: string;
      lastName?: string;
    };
    specialization?: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  type?: string;
}

const MySessions = () => {
  const navItems = [
    { icon: <TrendingUp className="w-5 h-5" />, label: "Dashboard", path: "/dashboard" },
    { icon: <BookOpen className="w-5 h-5" />, label: "Courses", path: "/courses" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "AI Chat", path: "/ai-chat" },
    { icon: <CalendarIcon className="w-5 h-5" />, label: "Book Session", path: "/book-session" },
    { icon: <NotebookPen className="w-5 h-5" />, label: "My Notes", path: "/notes" },
    { icon: <CalendarIcon className="w-5 h-5" />, label: "My Sessions", path: "/my-sessions" },
  ];

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState<string>("");
  const [rescheduleDuration, setRescheduleDuration] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();


  // Helper function to combine date and time properly
  const combineDateTime = (dateStr: string, timeStr: string): Date => {
    let date: Date;

    // Check if date is in ISO format (contains T or -)
    if (dateStr.includes('T') || (dateStr.includes('-') && !dateStr.includes('/'))) {
      date = new Date(dateStr);
    } else {
      // Parse date in DD/MM/YYYY format, trim to handle any extra spaces
      const dateParts = dateStr.trim().split('/');
      if (dateParts.length !== 3) {
        console.error(`Invalid date format: ${dateStr}`);
        return new Date(NaN); // Return invalid date
      }

      const [day, month, year] = dateParts.map(Number);
      if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
        // console.error(`Invalid date components: day=${day}, month=${month}, year=${year}`);
        return new Date(NaN); // Return invalid date
      }

      date = new Date(year, month - 1, day);
    }

    // Parse time like "10:00 AM" or "03:00 PM"
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeMatch) {
      // console.error(`Invalid time format: ${timeStr}`);
      return new Date(NaN); // Return invalid date
    }

    const [, hours, minutes, period] = timeMatch;
    let hour24 = parseInt(hours, 10);
    if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
    if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;

    date.setHours(hour24, parseInt(minutes, 10), 0, 0);
    return date;
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/user/sessions');
      // console.log('Fetched sessions:', response.data);
      // console.log('Sample session structure:', response.data[0] ? {
      //   counsellor: response.data[0].counsellor,
      //   specialization: response.data[0].specialization,
      //   counsellorSpecialization: response.data[0].counsellor?.specialization,
      //   counsellorUser: response.data[0].counsellor?.user
      // } : 'No sessions');
      // // Log all sessions' counsellor structures
      // response.data.forEach((session, index) => {
      //   console.log(`Session ${index}: counsellor=${session.counsellor}, user=${session.counsellor?.user}, firstName=${session.counsellor?.user?.firstName}`);
      // });
      setSessions(response.data as Session[]);
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

  const handleCancel = async (sessionId: string) => {
    try {
      await api.put(`/user/sessions/${sessionId}/cancel`, {});
      toast({
        title: "Success",
        description: "Session cancelled successfully",
      });
      fetchSessions(); // Refresh sessions
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel session",
        variant: "destructive",
      });
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime || !rescheduleDuration) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const rescheduleData = {
        date: rescheduleDate.toISOString(),
        startTime: rescheduleTime,
        duration: parseInt(rescheduleDuration),
      };
      await api.put(`/user/sessions/${selectedSession?._id}/reschedule`, rescheduleData);
      toast({
        title: "Success",
        description: "Session rescheduled successfully",
      });
      setRescheduleDialogOpen(false);
      setSelectedSession(null);
      setRescheduleDate(undefined);
      setRescheduleTime("");
      setRescheduleDuration("");
      fetchSessions(); // Refresh sessions
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reschedule session",
        variant: "destructive",
      });
    }
  };

  const handleBookAgain = (session: Session) => {
    if (session.counsellor && typeof session.counsellor === 'object') {
      navigate(`/book-session?counsellorId=${session.counsellor._id || session.counsellor}`);
    } else if (typeof session.counsellor === 'string') {
      navigate(`/book-session?counsellorId=${session.counsellor}`);
    } else {
      toast({
        title: "Error",
        description: "Counsellor information not available",
        variant: "destructive",
      });
    }
  };

  const openRescheduleDialog = (session: Session) => {
    // Open the reschedule dialog for the selected session
    setSelectedSession(session);
    setRescheduleDialogOpen(true);
  };


  const upcomingSessions = sessions.filter(session => {
    const sessionDateTime = combineDateTime(session.date, session.startTime);
    const isUpcoming = session.status === 'scheduled' && sessionDateTime > new Date();
    // console.log(`Session ${session._id}: status=${session.status}, date=${session.date}, startTime=${session.startTime}, parsed=${sessionDateTime}, isValid=${!isNaN(sessionDateTime.getTime())}, isUpcoming=${isUpcoming}`);
    return isUpcoming;
  });

  const pastSessions = sessions.filter(session => {
    const sessionDateTime = combineDateTime(session.date, session.startTime);
    const isPast = session.status !== 'scheduled' || sessionDateTime <= new Date();
    // console.log(`Past check Session ${session._id}: status=${session.status}, parsed=${sessionDateTime}, isValid=${!isNaN(sessionDateTime.getTime())}, isPast=${isPast}`);
    return isPast;
  });

  return (
    <DashboardLayout navItems={navItems} userRole="User">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Sessions</h1>
          <p className="text-muted-foreground">Manage your counselling appointments</p>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4 mt-6">
            {upcomingSessions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No upcoming sessions</p>
            ) : (
              upcomingSessions.map((session, index) => (
                <Card key={index} className="hover-lift">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-saffron flex items-center justify-center shadow-soft">
                          <span className="text-xl font-bold text-primary-foreground">
                            {session.counsellor?.user?.firstName?.[0] || 'U'}{session.counsellor?.user?.lastName?.[0] || 'U'}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-lg mb-1">{session.counsellor?.user?.firstName || 'Unknown'} {session.counsellor?.user?.lastName || 'User'}</CardTitle>
                          <p className="text-sm text-muted-foreground mb-2">{session.counsellor?.specialization || 'Specialization not available'}</p>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1 text-primary">
                              <CalendarIcon className="w-4 h-4" />
                              {(() => {
                                const date = session.date;
                                if (date.includes('T') || date.includes('-')) {
                                  return new Date(date).toLocaleDateString();
                                } else {
                                  const [day, month, year] = date.split('/').map(Number);
                                  return new Date(year, month - 1, day).toLocaleDateString();
                                }
                              })()}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {session.startTime} - {session.endTime}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-green-500">{session.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-gradient-saffron hover:shadow-glow"
                        onClick={() => navigate(`/video-call/${session._id}`)}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Join Session
                      </Button>
                      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex-1" onClick={() => openRescheduleDialog(session)}>
                            Reschedule
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Reschedule Session</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <label htmlFor="date" className="text-right">
                                Date
                              </label>
                              <input
                                id="date"
                                type="date"
                                value={rescheduleDate ? rescheduleDate.toISOString().split('T')[0] : ''}
                                onChange={(e) => {
                                  const selectedDate = e.target.value ? new Date(e.target.value) : undefined;
                                  setRescheduleDate(selectedDate);
                                }}
                                min={new Date().toISOString().split('T')[0]}
                                className="col-span-3 px-3 py-2 border border-input bg-background rounded-md text-sm"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <label htmlFor="time" className="text-right">
                                Time
                              </label>
                              <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="09:00 AM">09:00 AM</SelectItem>
                                  <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                                  <SelectItem value="11:00 AM">11:00 AM</SelectItem>
                                  <SelectItem value="02:00 PM">02:00 PM</SelectItem>
                                  <SelectItem value="03:00 PM">03:00 PM</SelectItem>
                                  <SelectItem value="04:00 PM">04:00 PM</SelectItem>
                                  <SelectItem value="05:00 PM">05:00 PM</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <label htmlFor="duration" className="text-right">
                                Duration
                              </label>
                              <Select value={rescheduleDuration} onValueChange={setRescheduleDuration}>
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="30">30 minutes</SelectItem>
                                  <SelectItem value="45">45 minutes</SelectItem>
                                  <SelectItem value="60">60 minutes</SelectItem>
                                  <SelectItem value="90">90 minutes</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleReschedule}>Reschedule</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => handleCancel(session._id)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-6">
            {loading ? (
              <p>Loading sessions...</p>
            ) : pastSessions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No past sessions</p>
            ) : (
              pastSessions.map((session) => (
                <Card key={session._id} className="hover-lift">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg mb-1">
                            {session.counsellor?.user?.firstName || 'Unknown'} {session.counsellor?.user?.lastName || 'User'}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mb-2">{session.counsellor?.specialization || 'Specialization not available'}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4" />
                              {(() => {
                                const date = session.date;
                                const [day, month, year] = date.split('/').map(Number);
                                return new Date(year, month - 1, day).toLocaleDateString();
                              })()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.startTime} - {session.endTime}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">{session.status === 'completed' ? 'Completed' : 'Past'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {session.notes && (
                      <div className="bg-secondary rounded-lg p-4 mb-3">
                        <p className="text-sm font-medium mb-1">Session Notes:</p>
                        <p className="text-sm text-muted-foreground">{session.notes}</p>
                      </div>
                    )}
                    <Button variant="outline" className="w-full" onClick={() => handleBookAgain(session)}>
                      Book Again with {session.counsellor?.user?.firstName || 'Unknown'} {session.counsellor?.user?.lastName || 'User'}
                    </Button>
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

export default MySessions;
