import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { BookOpen, Calendar as CalendarIcon, MessageSquare, NotebookPen, TrendingUp, Star, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { default as api } from "@/lib/auth";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";

interface Counsellor {
  _id: string;
  user: {
    firstName: string;
    lastName: string;
  };
  specialization: string;
  experience: string;
  rating: number;
  totalReviews: number;
  isApproved: boolean;
}

const BookSession = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedCounsellor, setSelectedCounsellor] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preSelectedCounsellorId = searchParams.get('counsellorId');

  const navItems = [
    { icon: <TrendingUp className="w-5 h-5" />, label: "Dashboard", path: "/dashboard" },
    { icon: <BookOpen className="w-5 h-5" />, label: "Courses", path: "/courses" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "AI Chat", path: "/ai-chat" },
    { icon: <CalendarIcon className="w-5 h-5" />, label: "Book Session", path: "/book-session" },
    { icon: <NotebookPen className="w-5 h-5" />, label: "My Notes", path: "/notes" },
    { icon: <CalendarIcon className="w-5 h-5" />, label: "My Sessions", path: "/my-sessions" },
  ];

  useEffect(() => {
    fetchCounsellors();
  }, []);

  useEffect(() => {
    if (selectedCounsellor && date) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [selectedCounsellor, date]);

  const fetchCounsellors = async () => {
    try {
      const response = await api.get('/user/counsellors');
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

  const fetchAvailableSlots = async () => {
    if (!selectedCounsellor || !date) return;

    setSlotsLoading(true);
    try {
      const dateString = date.toISOString().split('T')[0];
      const response = await api.get(`/user/counsellors/${selectedCounsellor}/availability?date=${dateString}`);
      setAvailableSlots(response.data.availableSlots || []);
    } catch (error) {
      // console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
      toast({
        title: "Error",
        description: "Failed to load available time slots",
        variant: "destructive",
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleBookSession = async (counsellorId: string) => {
    console.log('handleBookSession called with counsellorId:', counsellorId, 'date:', date, 'selectedTime:', selectedTime);
    if (!date || !selectedTime) {
      toast({
        title: "Error",
        description: "Please select a date and time",
        variant: "destructive",
      });
      return;
    }

    // Check if selected date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      toast({
        title: "Error",
        description: "Cannot book sessions in the past",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.post('/user/sessions', {
        counsellor: counsellorId,
        date: date.toISOString().split('T')[0],
        startTime: selectedTime,
        duration: 60, // 1 hour
      });

      toast({
        title: "Success",
        description: "Session booked successfully!",
      });

      // Navigate to sessions page after successful booking
      navigate('/my-sessions');
    } catch (error: any) {
      console.error('Error booking session:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to book session",
        variant: "destructive",
      });
    }
  };


  return (
    <DashboardLayout navItems={navItems} userRole="User">
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">Book a Counselling Session</h1>
          <p className="text-muted-foreground">Connect with expert counsellors for personalized guidance</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Counsellors */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">Available Counsellors</h2>
            {loading ? (
              <p>Loading counsellors...</p>
            ) : counsellors.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No counsellors available</p>
            ) : (
              counsellors.map((counsellor, index) => (
                <Card key={counsellor._id} className={`hover-lift ${preSelectedCounsellorId === counsellor._id ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-saffron flex items-center justify-center shadow-soft">
                          <span className="text-xl font-bold text-primary-foreground">
                            {counsellor.user.firstName[0]}{counsellor.user.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-lg mb-1">
                            {counsellor.user.firstName} {counsellor.user.lastName}
                            {preSelectedCounsellorId === counsellor._id && (
                              <Badge variant="default" className="ml-2 text-xs">Pre-selected</Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mb-2">{counsellor.specialization}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-primary text-primary" />
                              {counsellor.rating}
                            </span>
                            <span className="text-muted-foreground">{counsellor.totalReviews} reviews</span>
                            <span className="text-muted-foreground">{counsellor.experience}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-green-500">Available</Badge>
                    </div>
                  </CardHeader>
                  <CardFooter>
                    {selectedCounsellor === counsellor._id ? (
                      <Button
                        className="w-full bg-green-500"
                        onClick={() => handleBookSession(counsellor._id)}
                      >
                        Book Session
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-gradient-saffron"
                        onClick={() => setSelectedCounsellor(counsellor._id)}
                      >
                        Select Counsellor
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Available Times
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {slotsLoading ? (
                  <div className="text-center py-4">Loading available times...</div>
                ) : !selectedCounsellor ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Please select a counsellor first
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No available time slots for this date
                  </div>
                ) : (
                  availableSlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant={selectedTime === slot ? "default" : "outline"}
                      className={`w-full justify-start hover:bg-primary/10 hover:border-primary ${selectedTime === slot ? "bg-primary text-primary-foreground" : ""
                        }`}
                      onClick={() => setSelectedTime(slot)}
                    >
                      {slot}
                    </Button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BookSession;
