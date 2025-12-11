import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { User, Stethoscope } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [userForm, setUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false
  });
  const [counsellorForm, setCounsellorForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    specialization: "",
    credentials: "",
    bio: "",
    experience: "",
    password: "",
    termsAccepted: false
  });

  const validateUserForm = () => {
    if (!userForm.firstName || !userForm.lastName || !userForm.email || !userForm.password) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return false;
    }
    if (userForm.password !== userForm.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return false;
    }
    if (!userForm.termsAccepted) {
      toast({ title: "Error", description: "You must accept the terms", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateCounsellorForm = () => {
    if (!counsellorForm.firstName || !counsellorForm.lastName || !counsellorForm.email || !counsellorForm.password || !counsellorForm.specialization || !counsellorForm.credentials || !counsellorForm.bio) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return false;
    }
    if (!counsellorForm.termsAccepted) {
      toast({ title: "Error", description: "You must accept the terms", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleUserSignup = async () => {
    if (!validateUserForm()) return;
    setLoading(true);
    try {
      const response = await register({
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        email: userForm.email,
        password: userForm.password,
        role: 'user'
      });
      setRegisteredEmail(userForm.email);
      setRegistrationSuccess(true);
      toast({ title: "Success", description: response.message || "Account created! Please check your email." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCounsellorSignup = async () => {
    if (!validateCounsellorForm()) return;
    setLoading(true);
    try {
      const response = await register({
        firstName: counsellorForm.firstName,
        lastName: counsellorForm.lastName,
        email: counsellorForm.email,
        password: counsellorForm.password,
        role: 'counsellor',
        specialization: counsellorForm.specialization,
        credentials: counsellorForm.credentials,
        bio: counsellorForm.bio,
        experience: counsellorForm.experience
      });
      setRegisteredEmail(counsellorForm.email);
      setRegistrationSuccess(true);
      toast({ title: "Success", description: response.message || "Application submitted! Please verify your email." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-warm p-4">
        <Card className="w-full max-w-md shadow-medium animate-slide-up">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-saffron flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <CardTitle className="text-2xl">Check Your Email!</CardTitle>
            <CardDescription>
              We've sent a verification link to <strong>{registeredEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-medium mb-2">📧 Next Steps:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your inbox for the verification email</li>
                <li>Click the verification link (valid for 24 hours)</li>
                <li>Return to login once verified</li>
                <li>Check spam folder if you don't see it</li>
              </ul>
            </div>
            <Button
              className="w-full bg-gradient-saffron hover:shadow-glow transition-smooth"
              onClick={() => navigate("/login")}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-warm p-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center space-x-2 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-saffron flex items-center justify-center shadow-soft">
              <span className="text-2xl font-bold text-primary-foreground">W</span>
            </div>
            <span className="text-3xl font-bold bg-gradient-saffron bg-clip-text text-transparent">
              WiseDeep
            </span>
          </div>
          <p className="text-muted-foreground">Begin your journey to inner peace</p>
        </div>

        <Card className="shadow-medium animate-slide-up">
          <CardHeader>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Join thousands on their wellness journey</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="user" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="user" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  User Account
                </TabsTrigger>
                <TabsTrigger value="counsellor" className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Counsellor Account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="user" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input
                      id="first-name"
                      placeholder="John"
                      value={userForm.firstName}
                      onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                      id="last-name"
                      placeholder="Doe"
                      value={userForm.lastName}
                      onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={userForm.confirmPassword}
                    onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={userForm.termsAccepted}
                    onCheckedChange={(checked) => setUserForm({ ...userForm, termsAccepted: !!checked })}
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the terms of service and privacy policy
                  </label>
                </div>
                <Button
                  className="w-full bg-gradient-saffron hover:shadow-glow transition-smooth"
                  onClick={handleUserSignup}
                  disabled={loading}
                >
                  {loading ? "Creating Account..." : "Create User Account"}
                </Button>
              </TabsContent>

              <TabsContent value="counsellor" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="counsellor-first-name">First Name</Label>
                    <Input
                      id="counsellor-first-name"
                      placeholder="Jane"
                      value={counsellorForm.firstName}
                      onChange={(e) => setCounsellorForm({ ...counsellorForm, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="counsellor-last-name">Last Name</Label>
                    <Input
                      id="counsellor-last-name"
                      placeholder="Smith"
                      value={counsellorForm.lastName}
                      onChange={(e) => setCounsellorForm({ ...counsellorForm, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="counsellor-email">Email</Label>
                  <Input
                    id="counsellor-email"
                    type="email"
                    placeholder="your@email.com"
                    value={counsellorForm.email}
                    onChange={(e) => setCounsellorForm({ ...counsellorForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    placeholder="e.g., Spiritual Counselling, Psychology"
                    value={counsellorForm.specialization}
                    onChange={(e) => setCounsellorForm({ ...counsellorForm, specialization: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credentials">Credentials/Certifications</Label>
                  <Input
                    id="credentials"
                    placeholder="Your professional credentials"
                    value={counsellorForm.credentials}
                    onChange={(e) => setCounsellorForm({ ...counsellorForm, credentials: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about your experience and approach..."
                    className="min-h-[100px]"
                    value={counsellorForm.bio}
                    onChange={(e) => setCounsellorForm({ ...counsellorForm, bio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience (Optional)</Label>
                  <Input
                    id="experience"
                    placeholder="e.g., 5 years in spiritual counseling"
                    value={counsellorForm.experience}
                    onChange={(e) => setCounsellorForm({ ...counsellorForm, experience: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="counsellor-password">Password</Label>
                  <Input
                    id="counsellor-password"
                    type="password"
                    placeholder="••••••••"
                    value={counsellorForm.password}
                    onChange={(e) => setCounsellorForm({ ...counsellorForm, password: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="counsellor-terms"
                    checked={counsellorForm.termsAccepted}
                    onCheckedChange={(checked) => setCounsellorForm({ ...counsellorForm, termsAccepted: !!checked })}
                  />
                  <label htmlFor="counsellor-terms" className="text-sm text-muted-foreground">
                    I agree to the counsellor terms and code of ethics
                  </label>
                </div>
                <div className="bg-accent/50 p-4 rounded-lg text-sm text-muted-foreground">
                  Your application will be reviewed by our admin team before approval.
                </div>
                <Button
                  className="w-full bg-gradient-saffron hover:shadow-glow transition-smooth"
                  onClick={handleCounsellorSignup}
                  disabled={loading}
                >
                  {loading ? "Submitting Application..." : "Submit Counsellor Application"}
                </Button>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <button
                onClick={() => navigate("/login")}
                className="text-primary hover:underline font-medium"
              >
                Sign in
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

export default Signup;
