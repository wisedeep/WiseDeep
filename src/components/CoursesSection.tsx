import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { default as api } from "@/lib/auth";

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  instructor: string;
  duration: string;
}

const CoursesSection = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/user/courses/public');
      // Show only first 3 courses for home page
      setCourses(response.data.slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      // Fallback sample data
      setCourses([
        {
          _id: '1',
          title: 'Mindfulness Meditation',
          description: 'Learn the fundamentals of mindfulness and meditation practices.',
          category: 'Mental Wellness',
          instructor: 'Dr. Sarah Wilson',
          duration: '4 weeks'
        },
        {
          _id: '2',
          title: 'Spiritual Wisdom of Ancient Texts',
          description: 'Explore the profound teachings of sacred scriptures.',
          category: 'Spiritual Wisdom',
          instructor: 'Dr. Raj Patel',
          duration: '6 weeks'
        },
        {
          _id: '3',
          title: 'Personal Growth Journey',
          description: 'Transform yourself through guided self-discovery and development.',
          category: 'Personal Growth',
          instructor: 'Lisa Chen',
          duration: '8 weeks'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section id="courses" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center">Loading courses...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="courses" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Explore Our Courses</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover transformative courses designed to guide you towards inner peace and spiritual growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {courses.map((course) => (
            <Card key={course._id} className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {course.category}
                  </Badge>
                </div>
                <h3 className="font-semibold text-lg mb-3">{course.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{course.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
              <CardFooter className="p-6 pt-0">
                <Button className="w-full bg-gradient-saffron hover:shadow-glow">
                  View Course Details
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="bg-gradient-saffron hover:shadow-glow text-lg px-8 py-6"
            onClick={() => window.location.href = '/courses'}
          >
            View All Courses
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;