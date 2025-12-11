import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  Clock,
  Users,
  Star,
  Play,
  CheckCircle,
  ArrowLeft,
  Calendar,
  Award,
  FileText,
  Target,
  Video,
  Download,
  Edit,
  Trash2
} from "lucide-react";
import { useAuth } from "../../components/AuthContext";
import { default as api } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import StarRating from "@/components/StarRating";

interface Course {
  _id: string;
  title: string;
  description: string;
  longDescription?: string;
  duration: string;
  level: string;
  price: number;
  enrolledCount: number;
  isPublished: boolean;
  modules?: Module[];
  instructor?: string;
  rating?: number;
  reviews?: Review[];
}

interface Module {
  _id: string;
  title: string;
  description: string;
  duration: string;
  completed?: boolean;
  video?: {
    url: string;
    fileId: string;
  };
  pdf?: {
    url: string;
    fileId: string;
    fileName: string;
  };
}

interface Review {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [editingReview, setEditingReview] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const navItems = [
    { icon: <BookOpen className="w-5 h-5" />, label: "Dashboard", path: "/dashboard" },
    { icon: <BookOpen className="w-5 h-5" />, label: "Courses", path: "/courses" },
    { icon: <FileText className="w-5 h-5" />, label: "AI Chat", path: "/ai-chat" },
    { icon: <Calendar className="w-5 h-5" />, label: "Book Session", path: "/book-session" },
    { icon: <Play className="w-5 h-5" />, label: "My Notes", path: "/notes" },
    { icon: <Users className="w-5 h-5" />, label: "My Sessions", path: "/my-sessions" },
  ];

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
      checkEnrollmentStatus();
      fetchReviews();
    }
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      const response = await api.get(`/user/courses/${courseId}`);
      setCourse(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load course details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = async () => {
    try {
      const response = await api.get('/user/courses/enrolled');
      const enrolledCourse = response.data.find((c: Course) => c._id === courseId);
      setIsEnrolled(!!enrolledCourse);
      if (enrolledCourse) {
        // Calculate progress (this would be more sophisticated in a real app)
        setProgress(25); // Mock progress
      }
    } catch (error) {
      console.error('Error checking enrollment:', error);
    }
  };

  const handleEnroll = async () => {
    if (!courseId) return;

    setEnrolling(true);
    try {
      await api.post(`/user/courses/${courseId}/enroll`, {});

      toast({
        title: "Success",
        description: "Successfully enrolled in course!",
      });

      setIsEnrolled(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to enroll in course",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const handleStartLearning = () => {
    // Scroll to course content section
    const contentSection = document.getElementById('course-content');
    if (contentSection) {
      contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const fetchReviews = async () => {
    if (!courseId) return;
    try {
      const response = await api.get(`/user/courses/${courseId}/reviews`);
      setReviews(response.data);
      // Check if current user has reviewed
      const myReview = response.data.find((r: Review) => r.user._id === user?.userId);
      setUserReview(myReview || null);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    try {
      if (editingReview && userReview) {
        // Update existing review
        await api.put(`/user/reviews/${userReview._id}`, {
          rating: reviewRating,
          comment: reviewComment
        });
        toast({ title: "Success", description: "Review updated successfully!" });
      } else {
        // Submit new review
        await api.post(`/user/courses/${courseId}/reviews`, {
          rating: reviewRating,
          comment: reviewComment
        });
        toast({ title: "Success", description: "Review submitted successfully!" });
      }

      setShowReviewForm(false);
      setEditingReview(false);
      setReviewRating(5);
      setReviewComment('');
      fetchReviews();
      fetchCourseDetails(); // Refresh to update average rating
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to submit review",
        variant: "destructive",
      });
    }
  };

  const handleEditReview = () => {
    if (userReview) {
      setReviewRating(userReview.rating);
      setReviewComment(userReview.comment);
      setEditingReview(true);
      setShowReviewForm(true);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview || !window.confirm('Are you sure you want to delete your review?')) return;

    try {
      await api.delete(`/user/reviews/${userReview._id}`);
      toast({ title: "Success", description: "Review deleted successfully!" });
      setUserReview(null);
      fetchReviews();
      fetchCourseDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} userRole="User">
        <div className="space-y-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/courses')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </div>
          <div className="space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout navItems={navItems} userRole="User">
        <div className="space-y-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/courses')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </div>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Course Not Found</h2>
            <p className="text-muted-foreground">The course you're looking for doesn't exist.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} userRole="User">
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/courses')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </div>

        {/* Course Header */}
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                <Badge variant="outline" className="text-sm">{course.level}</Badge>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-primary text-primary" />
                  <span className="text-sm">{course.rating || 4.5}</span>
                </div>
              </div>
              <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-muted-foreground mb-6">{course.description}</p>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{course.enrolledCount} students enrolled</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  <span>{course.instructor || 'Expert Instructor'}</span>
                </div>
              </div>
            </div>

            <div className="lg:w-80">
              <Card className="sticky top-6">
                <CardHeader>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">${course.price}</div>
                    {isEnrolled && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEnrolled ? (
                    <Button className="w-full bg-gradient-saffron" onClick={handleStartLearning}>
                      <Play className="w-4 h-4 mr-2" />
                      Continue Learning
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-gradient-saffron"
                      onClick={handleEnroll}
                      disabled={enrolling}
                    >
                      {enrolling ? "Enrolling..." : "Enroll Now"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Course Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* What You'll Learn */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  What You'll Learn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <span>Understanding mental health fundamentals</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <span>Developing coping strategies</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <span>Building resilience and emotional intelligence</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <span>Practical tools for daily mental wellness</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Content */}
            <Card id="course-content">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Course Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                {course.modules && course.modules.length > 0 ? (
                  <div className="space-y-4">
                    {course.modules.map((module, index) => (
                      <div key={module._id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-muted-foreground">
                                Module {index + 1}
                              </span>
                              {module.completed && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <h4 className="font-semibold text-lg mb-1">{module.title}</h4>
                            <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>{module.duration}</span>
                            </div>
                          </div>
                        </div>

                        {/* Video Player */}
                        {module.video && isEnrolled && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <Video className="w-4 h-4 text-primary" />
                              <span>Video Lesson</span>
                            </div>
                            <video
                              src={`http://localhost:5000${module.video.url}`}
                              controls
                              className="w-full rounded-lg"
                            />
                          </div>
                        )}

                        {/* PDF Download */}
                        {module.pdf && isEnrolled && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <span>Course Material</span>
                            </div>
                            <a
                              href={`http://localhost:5000${module.pdf.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-primary hover:underline p-3 border rounded-lg hover:bg-secondary/50 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              <span>{module.pdf.fileName || 'Download PDF'}</span>
                            </a>
                          </div>
                        )}

                        {/* Locked Content Message */}
                        {!isEnrolled && (module.video || module.pdf) && (
                          <div className="bg-muted/50 rounded-lg p-4 text-center">
                            <p className="text-sm text-muted-foreground">
                              Enroll in this course to access video lessons and materials
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No modules available yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Course Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Course</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {course.longDescription || course.description}
                </p>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Student Reviews
                  </CardTitle>
                  {isEnrolled && !userReview && !showReviewForm && (
                    <Button
                      size="sm"
                      onClick={() => setShowReviewForm(true)}
                      className="bg-gradient-saffron"
                    >
                      Write a Review
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Review Form */}
                  {isEnrolled && showReviewForm && (
                    <Card className="border-2 border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {editingReview ? 'Edit Your Review' : 'Write a Review'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleSubmitReview} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Your Rating *</label>
                            <StarRating
                              rating={reviewRating}
                              onRatingChange={setReviewRating}
                              size="lg"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Your Review (Optional)</label>
                            <Textarea
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              placeholder="Share your experience with this course..."
                              className="min-h-[100px]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowReviewForm(false);
                                setEditingReview(false);
                                setReviewRating(5);
                                setReviewComment('');
                              }}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" className="bg-gradient-saffron">
                              {editingReview ? 'Update Review' : 'Submit Review'}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {/* User's Own Review */}
                  {userReview && !showReviewForm && (
                    <Card className="border-2 border-primary/20 bg-primary/5">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">Your Review</span>
                              <Badge variant="outline">Verified</Badge>
                            </div>
                            <StarRating rating={userReview.rating} readonly size="sm" />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleEditReview}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={handleDeleteReview}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {userReview.comment && (
                          <p className="text-muted-foreground mb-2">{userReview.comment}</p>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(userReview.createdAt).toLocaleDateString()}
                        </span>
                      </CardContent>
                    </Card>
                  )}

                  {/* Other Reviews */}
                  <div className="space-y-4">
                    {reviews.filter(r => r.user._id !== user?.userId).length > 0 ? (
                      reviews
                        .filter(r => r.user._id !== user?.userId)
                        .map((review) => (
                          <div key={review._id} className="border-b pb-4 last:border-b-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <span className="font-medium">
                                  {review.user.firstName} {review.user.lastName}
                                </span>
                                <div className="mt-1">
                                  <StarRating rating={review.rating} readonly size="sm" />
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-muted-foreground">{review.comment}</p>
                            )}
                          </div>
                        ))
                    ) : (
                      !userReview && (
                        <div className="text-center py-8">
                          <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
                          <p className="text-muted-foreground">
                            {isEnrolled
                              ? 'Be the first to review this course!'
                              : 'Enroll in this course to leave a review!'}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{course.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Level</span>
                  <Badge variant="outline">{course.level}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Students</span>
                  <span className="font-medium">{course.enrolledCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="font-medium">{course.rating || 4.5}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instructor */}
            <Card>
              <CardHeader>
                <CardTitle>Your Instructor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-saffron rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-primary-foreground">
                      {course.instructor?.[0] || 'E'}
                    </span>
                  </div>
                  <h4 className="font-semibold">{course.instructor || 'Expert Counsellor'}</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    Certified mental health professional with {course.duration.split(' ')[0]} years of experience
                    helping individuals achieve mental wellness.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout >
  );
};

export default CourseDetail;