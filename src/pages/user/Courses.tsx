import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Calendar, MessageSquare, NotebookPen, TrendingUp, Search, Clock, Award, CheckCircle } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { useState, useEffect } from "react";
import { default as api } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  instructor: string;
  duration: string;
  enrolledUsers: string[];
  isPublished: boolean;
}

const Courses = () => {
  const navItems = [
    { icon: <TrendingUp className="w-5 h-5" />, label: "Dashboard", path: "/dashboard" },
    { icon: <BookOpen className="w-5 h-5" />, label: "Courses", path: "/courses" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "AI Chat", path: "/ai-chat" },
    { icon: <Calendar className="w-5 h-5" />, label: "Book Session", path: "/book-session" },
    { icon: <NotebookPen className="w-5 h-5" />, label: "My Notes", path: "/notes" },
    { icon: <Calendar className="w-5 h-5" />, label: "My Sessions", path: "/my-sessions" },
  ];

  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/user/courses');
      setCourses(response.data);
      // Check which courses user is enrolled in
      const enrolledIds = response.data
        .filter((course: Course) => course.enrolledUsers.includes(user?.id || ''))
        .map((course: Course) => course._id);
      setEnrolledCourses(enrolledIds);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      await api.post(`/user/courses/${courseId}/enroll`, {});
      setEnrolledCourses([...enrolledCourses, courseId]);
      toast({
        title: "Success",
        description: "Successfully enrolled in the course!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enroll in course",
        variant: "destructive",
      });
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isEnrolled = (courseId: string) => enrolledCourses.includes(courseId);

  return (
    <DashboardLayout navItems={navItems} userRole="User">
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">Explore Courses</h1>
          <p className="text-muted-foreground">Expand your knowledge and find inner peace</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search courses..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="default" className="cursor-pointer bg-gradient-saffron hover:shadow-soft" title="All Courses">
            All Courses
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary" title="Mental Wellness">
            Mental Wellness
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary" title="Spiritual Wisdom">
            Spiritual Wisdom
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary" title="Personal Growth">
            Personal Growth
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary" title="Mental Health">
            Mental Health
          </Badge>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, index) => (
            <Card key={index} className="hover-lift flex flex-col">
              <CardContent className="p-6 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {course.category}
                  </Badge>
                  {isEnrolled(course._id) && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-3">{course.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{course.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {course.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    By {course.instructor}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-0 flex gap-2">
                <Button
                  className="flex-1 bg-gradient-saffron"
                  variant="default"
                  onClick={() => navigate(`/courses/${course._id}`)}
                  aria-label="View Course Details"
                >
                  View Details
                </Button>
                {!isEnrolled(course._id) && (
                  <Button
                    variant="outline"
                    onClick={() => handleEnroll(course._id)}
                    aria-label="Enroll in Course"
                  >
                    Enroll
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Courses;
