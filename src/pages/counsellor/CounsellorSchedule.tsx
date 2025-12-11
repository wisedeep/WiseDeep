import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Users, ChevronLeft, ChevronRight, MoreVertical, MessageCircle, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { default as api } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { initializeClientSocket, getClientSocket, disconnectClientSocket } from "../../../utils/socketUtils.js";

interface AvailabilitySlot {
  day: string;
  startTime: string;
  endTime: string;
}

interface Session {
  id: string;
  client: string;
  time: string;
  type: string;
  status: string;
  date: string;
  startTime?: string;
}

interface TimeSlot {
  time: string;
  status: 'available' | 'booked' | 'unavailable' | 'past';
  session?: Session;
  day: string;
  date: Date;
}

interface CalendarDay {
  date: Date;
  dayName: string;
  isToday: boolean;
  timeSlots: TimeSlot[];
}

const CounsellorSchedule = () => {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleStats, setScheduleStats] = useState({
    sessionsToday: 0,
    sessionsThisWeek: 0,
    availableHours: 0
  });
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addSessionDialogOpen, setAddSessionDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<AvailabilitySlot[]>([]);
  const [newSession, setNewSession] = useState({
    client: '',
    date: '',
    time: '',
    type: 'Individual Therapy'
  });
  const [rescheduleSession, setRescheduleSession] = useState<Session | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [socket, setSocket] = useState<any>(null); // Keeping socket as any due to Socket type complexity in mixed environment
  const { toast } = useToast();

  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", path: "/counsellor/dashboard" },
    { icon: <Calendar className="w-5 h-5" />, label: "Schedule", path: "/counsellor/schedule" },
    { icon: <Users className="w-5 h-5" />, label: "My Clients", path: "/counsellor/clients" },
    { icon: <MessageCircle className="w-5 h-5" />, label: "Messages", path: "/counsellor/messages" },
    { icon: <Users className="w-5 h-5" />, label: "Settings", path: "/counsellor/settings" },
  ];

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ];

  useEffect(() => {
    fetchAllData();

    // Initialize socket connection for real-time updates
    const socketInstance = initializeClientSocket();
    setSocket(socketInstance);

    if (socketInstance) {
      // Register as counsellor for targeted notifications
      socketInstance.emit('register-counsellor', user?.id);

      // Listen for session booking notifications
      socketInstance.on('session-booked', (data: { id: string; client: string; time: string; date: string }) => {
        // console.log('New session booked:', data);
        // Refresh schedule data when a new session is booked
        fetchAllData(currentWeek);
      });

      // Listen for session updates (rescheduled, cancelled)
      socketInstance.on('session-updated', (data: { id: string; status: string }) => {
        // console.log('Session updated:', data);
        fetchAllData(currentWeek);
      });
    }

    // Cleanup socket connection on unmount
    return () => {
      if (socketInstance) {
        socketInstance.off('session-booked');
        socketInstance.off('session-updated');
      }
    };
  }, [user?.id]);

  // When week changes, fetch new data
  useEffect(() => {
    fetchAllData(currentWeek);
  }, [currentWeek]);

  // Generate calendar data when data changes
  useEffect(() => {
    if (availability.length > 0 || upcomingSessions.length > 0) {
      const calendar = generateCalendarData();
      setCalendarData(calendar);
    }
  }, [availability, upcomingSessions, currentWeek]);

  const handleUpdateAvailability = async (newAvailability: AvailabilitySlot[]) => {
    try {
      await api.put('/counsellor/availability', { availability: newAvailability });
      setAvailability(newAvailability);
      setEditDialogOpen(false);
    } catch (error) {
      // console.error('Error updating availability:', error);
    }
  };

  const openEditDialog = () => {
    setEditingAvailability([...availability]);
    setEditDialogOpen(true);
  };

  const handleAvailabilityChange = (day: string, field: keyof AvailabilitySlot, value: string) => {
    setEditingAvailability(prev => prev.map(slot =>
      slot.day === day ? { ...slot, [field]: value } : slot
    ));
  };

  const toggleDayAvailability = (day: string, available: boolean) => {
    if (available) {
      // Add day with default times
      const newSlot = { day, startTime: "09:00", endTime: "17:00" };
      setEditingAvailability(prev => [...prev, newSlot]);
    } else {
      // Remove day
      setEditingAvailability(prev => prev.filter(slot => slot.day !== day));
    }
  };

  const handleAddSession = async () => {
    try {
      if (!newSession.client || !newSession.date || !newSession.time) {
        toast({
          title: "Missing fields",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Convert time to 12-hour format for storage
      const [hours24, minutes] = newSession.time.split(':').map(Number);
      let displayHours = hours24 % 12;
      if (displayHours === 0) displayHours = 12;
      const period = hours24 >= 12 ? 'PM' : 'AM';
      const formattedTime = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;

      // Validate that the session doesn't conflict with existing ones
      const selectedDate = new Date(newSession.date);
      const dayOfWeek = selectedDate.getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[dayOfWeek];

      const counsellorData = await api.get('/counsellor/profile');
      const counsellor = counsellorData.data;
      const dayAvailability = counsellor.availability?.find((slot: any) => slot.day === dayName);

      if (!dayAvailability) {
        toast({
          title: "Unavailable",
          description: "Counsellor is not available on this day",
          variant: "destructive",
        });
        return;
      }

      // Check if time is within availability
      const sessionStart = new Date(selectedDate);
      sessionStart.setHours(hours24, minutes, 0, 0);

      const [availStartHour, availStartMin] = dayAvailability.startTime.split(':').map(Number);
      const [availEndHour, availEndMin] = dayAvailability.endTime.split(':').map(Number);

      const availStart = new Date(selectedDate);
      availStart.setHours(availStartHour, availStartMin, 0, 0);

      const availEnd = new Date(selectedDate);
      availEnd.setHours(availEndHour, availEndMin, 0, 0);

      if (sessionStart < availStart || sessionStart >= availEnd) {
        toast({
          title: "Time outside availability",
          description: "Selected time is outside counsellors availability",
          variant: "destructive",
        });
        return;
      }

      // Check for conflicts with existing sessions
      const existingSessions = await api.get(`/counsellor/sessions?date=${newSession.date}`);
      const conflict = existingSessions.data.some((session: any) => {
        return session.startTime === formattedTime;
      });

      if (conflict) {
        toast({
          title: "Time Slot Booked",
          description: "This time slot is already booked",
          variant: "destructive",
        });
        return;
      }

      // Submit session with formatted time
      const sessionData = {
        ...newSession,
        time: formattedTime
      };

      await api.post('/counsellor/sessions', sessionData);
      setAddSessionDialogOpen(false);
      setNewSession({ client: '', date: '', time: '', type: 'Individual Therapy' });
      toast({
        title: "Session Scheduled",
        description: "New session has been successfully added.",
      });
      // Refresh data
      await fetchAllData(currentWeek);
    } catch (error) {
      // console.error('Error adding session:', error);
      toast({
        title: "Error",
        description: "Failed to add session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRescheduleSession = async () => {
    try {
      if (!rescheduleSession) return;

      // Convert time to 12-hour format for storage
      const [hours24, minutes] = rescheduleSession.time.split(':').map(Number);
      let displayHours = hours24 % 12;
      if (displayHours === 0) displayHours = 12;
      const period = hours24 >= 12 ? 'PM' : 'AM';
      const formattedTime = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;

      // Update the session with new date/time
      await api.put(`/counsellor/sessions/${rescheduleSession.id}/reschedule`, {
        date: rescheduleSession.date,
        startTime: formattedTime,
        duration: 60
      });

      setRescheduleDialogOpen(false);
      setRescheduleSession(null);
      toast({
        title: "Session Rescheduled",
        description: "Session has been successfully rescheduled.",
      });
      // Refresh data
      await fetchAllData(currentWeek);
    } catch (error) {
      // console.error('Error rescheduling session:', error);
      toast({
        title: "Error",
        description: "Failed to reschedule session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel this session?')) return;

    try {
      await api.put(`/counsellor/sessions/${sessionId}/cancel`);
      toast({
        title: "Session Cancelled",
        description: "Session has been successfully cancelled.",
      });
      // Refresh data
      await fetchAllData(currentWeek);
    } catch (error) {
      // console.error('Error canceling session:', error);
      toast({
        title: "Error",
        description: "Failed to cancel session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const convert12HourTo24Hour = (time12h: string): string => {
    const timeParts = time12h.split(' ');
    if (timeParts.length === 2) {
      const [time, period] = timeParts;
      let [hours, minutes] = time.split(':').map(Number);

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    return time12h;
  };

  const openRescheduleDialog = (session: any) => {
    // Convert date to YYYY-MM-DD format for HTML date input
    const sessionDate = new Date(session.date);
    const formattedDate = sessionDate.toISOString().split('T')[0];

    // Convert startTime from "09:00 AM" format to "09:00" for HTML time input
    const time24 = convert12HourTo24Hour(session.startTime);

    setRescheduleSession({
      ...session,
      date: formattedDate,
      time: time24
    });
    setRescheduleDialogOpen(true);
  };

  // Generate calendar data for the current week
  const generateCalendarData = (): CalendarDay[] => {
    const weekData: CalendarDay[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Get the start of the week (Monday)
    const weekStart = new Date(currentWeek);
    const dayOfWeek = weekStart.getDay();
    const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
    weekStart.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);

      const dayName = dayNames[date.getDay()];
      const isToday = date.toDateString() === new Date().toDateString();

      // Get availability for this day
      const dayAvailability = availability.find(slot => slot.day === dayName);

      // Generate time slots (9 AM to 5 PM, 1-hour slots)
      const timeSlots: TimeSlot[] = [];
      if (dayAvailability) {
        const [startHour, startMinute] = dayAvailability.startTime.split(':').map(Number);
        const [endHour, endMinute] = dayAvailability.endTime.split(':').map(Number);

        let currentHour = startHour;
        const currentMinute = startMinute || 0; // Default to 0 if undefined

        while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
          const time24 = currentHour;
          let displayHour = currentHour % 12;
          if (displayHour === 0) displayHour = 12;
          const period = currentHour >= 12 ? 'PM' : 'AM';
          const timeString = `${displayHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} ${period}`;

          // Check if this slot is in the past
          const slotDateTime = new Date(date);
          slotDateTime.setHours(currentHour, currentMinute, 0, 0);
          const isPast = slotDateTime < new Date();

          // Check if this slot has a session
          const sessionForSlot = upcomingSessions.find(session => {
            const sessionDate = new Date(session.date);
            // Check if sessions date matches current day
            const isSameDate = sessionDate.getDate() === date.getDate() &&
              sessionDate.getMonth() === date.getMonth() &&
              sessionDate.getFullYear() === date.getFullYear();

            if (!isSameDate) return false;

            // Normalize times for comparison
            // Session time format: "09:00 AM" or "09:00 AM - 10:00 AM"
            const sessionStartTime = session.time.split(' - ')[0].trim();
            const slotStartTime = timeString.trim();

            // Compare just the time part, ensuring formats match
            // Convert both to 24h for robust comparison
            try {
              const session24 = convert12HourTo24Hour(sessionStartTime);
              const slot24 = convert12HourTo24Hour(slotStartTime);
              return session24 === slot24;
            } catch (e) {
              return false;
            }
          });

          let status: TimeSlot['status'];
          if (isPast) {
            status = 'past';
          } else if (sessionForSlot) {
            status = 'booked';
          } else {
            status = 'available';
          }

          timeSlots.push({
            time: timeString,
            status,
            session: sessionForSlot,
            day: dayName,
            date: new Date(slotDateTime) // Ensure clean date object
          });

          // Move to next hour, keeping same minute
          const nextDate = new Date(date);
          nextDate.setHours(currentHour + 1, currentMinute, 0, 0);
          currentHour = nextDate.getHours();
        }
      }

      weekData.push({
        date,
        dayName,
        isToday,
        timeSlots
      });
    }

    return weekData;
  };

  // Week navigation
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  // Fetch all data
  const fetchAllData = async (weekStart = new Date()) => {
    try {
      // Calculate start and end of week for query
      const start = new Date(weekStart);
      const dayOfWeek = start.getDay();
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      end.setHours(23, 59, 59, 999);

      const [availabilityResponse, sessionsResponse, statsResponse, clientsResponse] = await Promise.all([
        api.get('/counsellor/schedule'),
        api.get(`/counsellor/sessions?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
        api.get('/counsellor/schedule-stats'),
        api.get('/counsellor/clients')
      ]);

      setAvailability(availabilityResponse.data || []);

      // Transform session data to header interface format
      const formattedSessions = sessionsResponse.data.map((session: any) => ({
        id: session._id,
        client: `${session.user.firstName} ${session.user.lastName}`,
        time: session.startTime, // Use specific startTime
        type: 'Video Call',
        status: session.status,
        date: session.date,
      }));
      setUpcomingSessions(formattedSessions || []);

      setScheduleStats(statsResponse.data);
      setClients(clientsResponse.data || []);
      setLoading(false);
    } catch (error) {
      // console.error('Error fetching data:', error);
      // Set default values
      setAvailability([]);
      setUpcomingSessions([]);
      setScheduleStats({ sessionsToday: 0, sessionsThisWeek: 0, availableHours: 0 });
      setClients([]);
      toast({
        title: "Error",
        description: "Failed to load data. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout navItems={navItems} userRole="Counsellor">
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Schedule Management</h1>
            <p className="text-muted-foreground">Manage your availability and view upcoming sessions</p>
          </div>
          <Button className="bg-gradient-saffron w-full sm:w-auto" onClick={() => setAddSessionDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Session
          </Button>
        </div>

        {/* Enhanced Calendar View */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule Calendar
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('prev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {currentWeek.toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-8 gap-1">
              {/* Time column header */}
              <div className="p-2 text-xs font-medium text-muted-foreground">Time</div>

              {/* Day headers */}
              {calendarData.map((day) => (
                <div
                  key={day.dayName}
                  className={`p-2 text-center text-xs font-medium ${day.isToday ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                    }`}
                >
                  <div>{day.dayName.slice(0, 3)}</div>
                  <div className={`text-lg ${day.isToday ? 'font-bold' : ''}`}>
                    {day.date.getDate()}
                  </div>
                </div>
              ))}

              {/* Time slots */}
              {(() => {
                // Get all unique time slots across the week
                const allTimes = new Set<string>();
                calendarData.forEach(day => {
                  day.timeSlots.forEach(slot => allTimes.add(slot.time));
                });
                const sortedTimes = Array.from(allTimes).sort();

                return sortedTimes.map(time => (
                  <React.Fragment key={time}>
                    {/* Time label */}
                    <div className="p-2 text-xs text-muted-foreground border-t flex items-center">
                      {time}
                    </div>

                    {/* Time slots for each day */}
                    {calendarData.map((day) => {
                      const slot = day.timeSlots.find(s => s.time === time);
                      if (!slot) {
                        return (
                          <div key={`${day.dayName}-${time}`} className="p-1 border-t">
                            <div className="h-8 bg-gray-100 rounded opacity-30"></div>
                          </div>
                        );
                      }

                      return (
                        <div key={`${day.dayName}-${time}`} className="p-1 border-t">
                          <div
                            className={`h-8 rounded cursor-pointer transition-all hover:scale-105 flex items-center justify-center text-xs font-medium ${slot.status === 'available'
                              ? 'bg-green-100 hover:bg-green-200 text-green-800 border border-green-300'
                              : slot.status === 'booked'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : slot.status === 'past'
                                  ? 'bg-gray-200 text-gray-500'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            onClick={() => {
                              if (slot.status === 'available') {
                                // Pre-fill add session dialog
                                const time24 = convert12HourTo24Hour(slot.time);
                                setNewSession({
                                  client: '',
                                  date: slot.date.toISOString().split('T')[0],
                                  time: time24,
                                  type: 'Individual Therapy'
                                });
                                setAddSessionDialogOpen(true);
                              }
                            }}
                          >
                            {slot.status === 'booked' && slot.session ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <div className="flex items-center gap-1">
                                    <span className="truncate max-w-16">
                                      {slot.session.client.split(' ')[0]}
                                    </span>
                                    <MoreVertical className="w-3 h-3" />
                                  </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => openRescheduleDialog(slot.session)}>
                                    Reschedule
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleCancelSession(slot.session.id)}
                                  >
                                    Cancel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : slot.status === 'available' ? (
                              '+'
                            ) : (
                              '—'
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ));
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-gradient-saffron" onClick={() => setAddSessionDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule New Session
              </Button>
              <Button variant="outline" className="w-full" onClick={openEditDialog}>
                <Calendar className="w-4 h-4 mr-2" />
                Edit Availability
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Sessions Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Next Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : upcomingSessions.slice(0, 3).length > 0 ? (
                <div className="space-y-2">
                  {upcomingSessions.slice(0, 3).map((session, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-20">{session.client}</span>
                      <span className="text-muted-foreground">{session.time.split(' - ')[0]}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No sessions
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sessions Today</p>
                    <p className="text-2xl font-bold">{loading ? '...' : scheduleStats.sessionsToday}</p>
                  </div>
                  <Clock className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold">{loading ? '...' : scheduleStats.sessionsThisWeek}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Available Hours</p>
                    <p className="text-2xl font-bold">{loading ? '...' : scheduleStats.availableHours}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Availability Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Weekly Availability</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {daysOfWeek.map((day) => {
                const isAvailable = editingAvailability.some(slot => slot.day === day);
                const slot = editingAvailability.find(slot => slot.day === day);
                return (
                  <div key={day} className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 p-4 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={isAvailable}
                        onCheckedChange={(checked) => toggleDayAvailability(day, checked)}
                      />
                      <Label className="font-medium">{day}</Label>
                    </div>
                    {isAvailable && slot && (
                      <div className="flex items-center space-x-2 ml-0 sm:ml-auto">
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleAvailabilityChange(day, 'startTime', e.target.value)}
                          className="w-24"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleAvailabilityChange(day, 'endTime', e.target.value)}
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateAvailability(editingAvailability)} className="w-full sm:w-auto">
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Session Dialog */}
        <Dialog open={addSessionDialogOpen} onOpenChange={setAddSessionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="client">Select Client</Label>
                <Select
                  value={newSession.client}
                  onValueChange={(value) => setNewSession(prev => ({ ...prev, client: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0 ? (
                      <SelectItem value="" disabled>
                        No clients available
                      </SelectItem>
                    ) : (
                      clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newSession.date}
                  onChange={(e) => setNewSession(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="time">Start Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={newSession.time}
                  onChange={(e) => setNewSession(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="type">Session Type</Label>
                <Select
                  value={newSession.type}
                  onValueChange={(value) => setNewSession(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual Therapy">Individual Therapy</SelectItem>
                    <SelectItem value="Couples Counseling">Couples Counseling</SelectItem>
                    <SelectItem value="Family Therapy">Family Therapy</SelectItem>
                    <SelectItem value="Group Session">Group Session</SelectItem>
                    <SelectItem value="Consultation">Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setAddSessionDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleAddSession} className="w-full sm:w-auto">Schedule Session</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reschedule Session Dialog */}
        <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reschedule Session</DialogTitle>
            </DialogHeader>
            {rescheduleSession && (
              <div className="space-y-4">
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-sm font-medium">{rescheduleSession.client}</p>
                  <p className="text-xs text-muted-foreground">
                    Current: {rescheduleSession.date} at {rescheduleSession.startTime}
                  </p>
                </div>
                <div>
                  <Label htmlFor="reschedule-date">New Date</Label>
                  <Input
                    id="reschedule-date"
                    type="date"
                    value={rescheduleSession.date || ''}
                    onChange={(e) => setRescheduleSession(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="reschedule-time">New Start Time</Label>
                  <Input
                    id="reschedule-time"
                    type="time"
                    value={rescheduleSession.time || ''}
                    onChange={(e) => setRescheduleSession(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleRescheduleSession} className="w-full sm:w-auto">
                    Reschedule Session
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CounsellorSchedule;
