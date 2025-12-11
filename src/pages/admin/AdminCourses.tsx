import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Edit, Trash2, Search, Upload, LayoutDashboard, UserCheck, Users, Calendar, Video, FileText, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { default as api } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  instructor: string;
  duration: string;
  isPublished: boolean;
  modules?: Module[];
}

interface Module {
  _id: string;
  title: string;
  description?: string;
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

const AdminCourses = () => {
  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", path: "/admin/dashboard" },
    { icon: <Upload className="w-5 h-5" />, label: "Manage Courses", path: "/admin/courses" },
    { icon: <UserCheck className="w-5 h-5" />, label: "Counsellor Approvals", path: "/admin/approvals" },
    { icon: <Users className="w-5 h-5" />, label: "User Management", path: "/admin/users" },
    { icon: <Calendar className="w-5 h-5" />, label: "All Sessions", path: "/admin/sessions" },
  ];

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    instructor: "",
    duration: "",
    isPublished: true
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const [managingCourse, setManagingCourse] = useState<Course | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleFormData, setModuleFormData] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/admin/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingCourse
        ? `/admin/courses/${editingCourse._id}`
        : '/admin/courses';
      const method = editingCourse ? 'put' : 'post';

      const response = await api[method](url, formData);

      toast({
        title: "Success",
        description: editingCourse ? "Course updated successfully!" : "Course created successfully!",
      });

      setShowForm(false);
      setEditingCourse(null);
      setFormData({
        title: "",
        description: "",
        category: "",
        instructor: "",
        duration: "",
        isPublished: true
      });

      // Refresh the courses list
      fetchCourses();
    } catch (error: any) {
      console.error('Error saving course:', error);

      let errorMessage = "Failed to save course";

      if (error.response) {
        // Server responded with error
        console.error('Server responded with:', error.response.status, error.response.data);
        console.error('Server response data details:', JSON.stringify(error.response.data, null, 2));
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request made but no response
        console.error('No response received:', error.request);
        errorMessage = "No response from server. Is the server running?";
      } else {
        // Error in request setup
        console.error('Error during request setup:', error.message);
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      category: course.category,
      instructor: course.instructor,
      duration: course.duration,
      isPublished: course.isPublished
    });
    setShowForm(true);
  };

  const handleDelete = async (courseId: string) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        await api.delete(`/admin/courses/${courseId}`);

        toast({
          title: "Success",
          description: "Course deleted successfully!",
        });

        setCourses(courses.filter(c => c._id !== courseId));
      } catch (error) {
        console.error('Error deleting course:', error);
        toast({
          title: "Error",
          description: "Failed to delete course",
          variant: "destructive",
        });
      }
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleManageModules = async (course: Course) => {
    try {
      const response = await api.get(`/admin/courses/${course._id}`);
      setManagingCourse(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load course modules",
        variant: "destructive",
      });
    }
  };

  const handleVideoUpload = async (moduleId: string, file: File) => {
    if (!managingCourse) return;

    setUploadingVideo(moduleId);
    const formData = new FormData();
    formData.append('video', file);

    try {
      await api.post(
        `/admin/courses/${managingCourse._id}/modules/${moduleId}/upload-video`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      toast({
        title: "Success",
        description: "Video uploaded successfully!",
      });

      // Refresh course data
      const response = await api.get(`/admin/courses/${managingCourse._id}`);
      setManagingCourse(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload video",
        variant: "destructive",
      });
    } finally {
      setUploadingVideo(null);
    }
  };

  const handlePdfUpload = async (moduleId: string, file: File) => {
    if (!managingCourse) return;

    setUploadingPdf(moduleId);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      await api.post(
        `/admin/courses/${managingCourse._id}/modules/${moduleId}/upload-pdf`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      toast({
        title: "Success",
        description: "PDF uploaded successfully!",
      });

      // Refresh course data
      const response = await api.get(`/admin/courses/${managingCourse._id}`);
      setManagingCourse(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload PDF",
        variant: "destructive",
      });
    } finally {
      setUploadingPdf(null);
    }
  };

  const handleDeleteVideo = async (moduleId: string) => {
    if (!managingCourse) return;

    try {
      await api.delete(`/admin/courses/${managingCourse._id}/modules/${moduleId}/video`);

      toast({
        title: "Success",
        description: "Video deleted successfully!",
      });

      const response = await api.get(`/admin/courses/${managingCourse._id}`);
      setManagingCourse(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive",
      });
    }
  };

  const handleDeletePdf = async (moduleId: string) => {
    if (!managingCourse) return;

    try {
      await api.delete(`/admin/courses/${managingCourse._id}/modules/${moduleId}/pdf`);

      toast({
        title: "Success",
        description: "PDF deleted successfully!",
      });

      const response = await api.get(`/admin/courses/${managingCourse._id}`);
      setManagingCourse(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete PDF",
        variant: "destructive",
      });
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingCourse || !moduleFormData.title) return;

    try {
      await api.post(`/admin/courses/${managingCourse._id}/modules`, moduleFormData);

      toast({
        title: "Success",
        description: "Module added successfully!",
      });

      setModuleFormData({ title: '', description: '' });
      setShowModuleForm(false);

      // Refresh course data
      const response = await api.get(`/admin/courses/${managingCourse._id}`);
      setManagingCourse(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add module",
        variant: "destructive",
      });
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!managingCourse) return;
    if (!window.confirm("Are you sure you want to delete this module? This will also delete all uploaded content.")) return;

    try {
      await api.delete(`/admin/courses/${managingCourse._id}/modules/${moduleId}`);

      toast({
        title: "Success",
        description: "Module deleted successfully!",
      });

      const response = await api.get(`/admin/courses/${managingCourse._id}`);
      setManagingCourse(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete module",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout navItems={navItems} userRole="Admin">
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Manage Courses</h1>
            <p className="text-muted-foreground">Create and manage learning content</p>
          </div>
          <Button className="bg-gradient-saffron hover:shadow-glow" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Course
          </Button>
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

        {/* Add/Edit Course Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingCourse ? 'Edit Course' : 'Add New Course'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Course title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category *</label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Meditation, Psychology"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description *</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Course description"
                    className="min-h-[100px]"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Instructor</label>
                    <Input
                      value={formData.instructor}
                      onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                      placeholder="Instructor name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration</label>
                    <Input
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="e.g., 4 weeks, 2 hours"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowForm(false);
                    setEditingCourse(null);
                    setFormData({
                      title: "",
                      description: "",
                      category: "",
                      instructor: "",
                      duration: "",
                      isPublished: true
                    });
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-saffron">
                    {editingCourse ? 'Update Course' : 'Create Course'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Courses List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course._id} className="hover-lift">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{course.title}</CardTitle>
                    <Badge variant={course.isPublished ? "default" : "secondary"}>
                      {course.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(course)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(course._id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {course.description}
                </p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>Category:</strong> {course.category}</p>
                  <p><strong>Instructor:</strong> {course.instructor}</p>
                  <p><strong>Duration:</strong> {course.duration}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => handleManageModules(course)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Manage Content
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCourses.length === 0 && !loading && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No courses found</h3>
            <p className="text-muted-foreground">Create your first course to get started.</p>
          </div>
        )}
      </div>

      {/* Module Management Dialog */}
      <Dialog open={!!managingCourse} onOpenChange={() => setManagingCourse(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Course Content - {managingCourse?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Add Module Button/Form */}
            {!showModuleForm ? (
              <Button
                onClick={() => setShowModuleForm(true)}
                className="w-full bg-gradient-saffron"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Module
              </Button>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add New Module</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddModule} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Module Title *</label>
                      <Input
                        value={moduleFormData.title}
                        onChange={(e) => setModuleFormData({ ...moduleFormData, title: e.target.value })}
                        placeholder="e.g., Introduction to Meditation"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description (Optional)</label>
                      <Textarea
                        value={moduleFormData.description}
                        onChange={(e) => setModuleFormData({ ...moduleFormData, description: e.target.value })}
                        placeholder="Brief description of this module"
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => {
                        setShowModuleForm(false);
                        setModuleFormData({ title: '', description: '' });
                      }}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-gradient-saffron">
                        Add Module
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Existing Modules */}
            {managingCourse?.modules && managingCourse.modules.length > 0 ? (
              managingCourse.modules.map((module) => (
                <Card key={module._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{module.title}</CardTitle>
                        {module.description && (
                          <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDeleteModule(module._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Video Upload Section */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Video className="w-5 h-5 text-primary" />
                          <h4 className="font-semibold">Video</h4>
                        </div>
                        {module.video && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteVideo(module._id)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                      {module.video ? (
                        <div className="space-y-2">
                          <video
                            src={`http://localhost:5000${module.video.url}`}
                            controls
                            className="w-full rounded-lg max-h-60"
                          />
                          <p className="text-xs text-muted-foreground">Video uploaded</p>
                        </div>
                      ) : (
                        <div>
                          <Input
                            type="file"
                            accept="video/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleVideoUpload(module._id, file);
                            }}
                            disabled={uploadingVideo === module._id}
                          />
                          {uploadingVideo === module._id && (
                            <p className="text-sm text-primary mt-2">Uploading video...</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* PDF Upload Section */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <h4 className="font-semibold">PDF Document</h4>
                        </div>
                        {module.pdf && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePdf(module._id)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                      {module.pdf ? (
                        <div className="space-y-2">
                          <a
                            href={`http://localhost:5000${module.pdf.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline"
                          >
                            <FileText className="w-4 h-4" />
                            {module.pdf.fileName || 'View PDF'}
                          </a>
                          <p className="text-xs text-muted-foreground">PDF uploaded</p>
                        </div>
                      ) : (
                        <div>
                          <Input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePdfUpload(module._id, file);
                            }}
                            disabled={uploadingPdf === module._id}
                          />
                          {uploadingPdf === module._id && (
                            <p className="text-sm text-primary mt-2">Uploading PDF...</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No modules found for this course.</p>
                <p className="text-sm text-muted-foreground mt-2">Add modules to the course first to upload content.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminCourses;