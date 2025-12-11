import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/AuthContext";
import PrivateRoute from "@/components/PrivateRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import UserDashboard from "./pages/user/Dashboard";
import Courses from "./pages/user/Courses";
import CourseDetail from "./pages/user/CourseDetail";
import AIChat from "./pages/user/AIChat";
import BookSession from "./pages/user/BookSession";
import Notes from "./pages/user/Notes";
import MySessions from "./pages/user/MySessions";
import Profile from "./pages/user/Profile";
import UserMessages from "./pages/user/UserMessages";
import CounsellorDashboard from "./pages/counsellor/CounsellorDashboard";
import CounsellorSchedule from "./pages/counsellor/CounsellorSchedule";
import CounsellorClients from "./pages/counsellor/CounsellorClients";
import CounsellorSettings from "./pages/counsellor/CounsellorSettings.tsx";
import CounsellorMessages from "./pages/counsellor/CounsellorMessages";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSessions from "./pages/admin/AdminSessions";
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminProfile from "./pages/admin/AdminProfile";
import VideoCall from "./pages/VideoCall";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />

            {/* User Routes */}
            <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
            <Route path="/courses" element={<PrivateRoute><Courses /></PrivateRoute>} />
            <Route path="/courses/:courseId" element={<PrivateRoute><CourseDetail /></PrivateRoute>} />
            <Route path="/ai-chat" element={<PrivateRoute><AIChat /></PrivateRoute>} />
            <Route path="/book-session" element={<PrivateRoute><BookSession /></PrivateRoute>} />
            <Route path="/notes" element={<PrivateRoute><Notes /></PrivateRoute>} />
            <Route path="/my-sessions" element={<PrivateRoute><MySessions /></PrivateRoute>} />
            <Route path="/messages" element={<PrivateRoute><UserMessages /></PrivateRoute>} />
            <Route path="/sessions" element={<PrivateRoute><MySessions /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/video-call/:sessionId" element={<PrivateRoute><VideoCall /></PrivateRoute>} />

            {/* Counsellor Routes */}
            <Route path="/counsellor/dashboard" element={<PrivateRoute requiredRole="counsellor"><CounsellorDashboard /></PrivateRoute>} />
            <Route path="/counsellor/schedule" element={<PrivateRoute requiredRole="counsellor"><CounsellorSchedule /></PrivateRoute>} />
            <Route path="/counsellor/clients" element={<PrivateRoute requiredRole="counsellor"><CounsellorClients /></PrivateRoute>} />
            <Route path="/counsellor/messages" element={<PrivateRoute requiredRole="counsellor"><CounsellorMessages /></PrivateRoute>} />
            <Route path="/counsellor/settings" element={<PrivateRoute requiredRole="counsellor"><CounsellorSettings /></PrivateRoute>} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<PrivateRoute requiredRole="admin"><AdminDashboard /></PrivateRoute>} />
            <Route path="/admin/courses" element={<PrivateRoute requiredRole="admin"><AdminCourses /></PrivateRoute>} />
            <Route path="/admin/approvals" element={<PrivateRoute requiredRole="admin"><AdminApprovals /></PrivateRoute>} />
            <Route path="/admin/users" element={<PrivateRoute requiredRole="admin"><AdminUsers /></PrivateRoute>} />
            <Route path="/admin/sessions" element={<PrivateRoute requiredRole="admin"><AdminSessions /></PrivateRoute>} />
            <Route path="/admin/profile" element={<PrivateRoute requiredRole="admin"><AdminProfile /></PrivateRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
