import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { User, Shield, Stethoscope } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("user");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: "Success", description: data.message });
        setNeedsVerification(false);
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to resend verification email", variant: "destructive" });
    } finally {
      setResendingVerification(false);
    }
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    setNeedsVerification(false);
    try {
      await login(formData.email, formData.password, activeTab);
      toast({ title: "Success", description: "Logged in successfully!" });
      if (activeTab === "user") navigate("/dashboard");
      if (activeTab === "counsellor") navigate("/counsellor/dashboard");
      if (activeTab === "admin") navigate("/admin/dashboard");
    } catch (error: any) {
      // Check if error is about email verification
      if (error.message?.includes("verify your email") || error.message?.includes("verification")) {
        setNeedsVerification(true);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-warm p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center space-x-2 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-saffron flex items-center justify-center shadow-soft">
              <span className="text-2xl font-bold text-primary-foreground">W</span>
            </div>
            <span className="text-3xl font-bold bg-gradient-saffron bg-clip-text text-transparent">
              WiseDeep
            </span>
          </div>
          <p className="text-muted-foreground">Welcome back to your wellness journey</p>
        </div>

        <Card className="shadow-medium animate-slide-up">
          <CardHeader>
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>Choose your role and enter your credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="user" className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  User
                </TabsTrigger>
                <TabsTrigger value="counsellor" className="flex items-center gap-1">
                  <Stethoscope className="w-4 h-4" />
                  Counsellor
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-1" disabled={formData.email.toLowerCase().endsWith('@admin.com')}>
                  <Shield className="w-4 h-4" />
                  Admin
                </TabsTrigger>
              </TabsList>

              {["user", "counsellor", "admin"].map((role) => (
                <TabsContent key={role} value={role} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${role}-email`}>Email</Label>
                    <Input
                      id={`${role}-email`}
                      type="email"
                      placeholder="your@email.com"
                      className="transition-smooth"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${role}-password`}>Password</Label>
                    <Input
                      id={`${role}-password`}
                      type="password"
                      placeholder="••••••••"
                      className="transition-smooth"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  {needsVerification && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      <p className="font-medium mb-1">📧 Email Verification Required</p>
                      <p className="mb-2">Please check your inbox for the verification link.</p>
                      <button
                        onClick={handleResendVerification}
                        disabled={resendingVerification}
                        className="text-primary hover:underline font-medium"
                      >
                        {resendingVerification ? "Sending..." : "Resend verification email"}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Button
                    className="w-full bg-gradient-saffron hover:shadow-glow transition-smooth"
                    onClick={handleLogin}
                    disabled={loading}
                  >
                    {loading ? "Signing In..." : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
                  </Button>
                </TabsContent>
              ))}
            </Tabs>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <button
                onClick={() => navigate("/signup")}
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-primary transition-smooth"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
