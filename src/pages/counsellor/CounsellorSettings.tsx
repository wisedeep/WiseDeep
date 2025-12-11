import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Mail, Phone, MapPin, Save, Upload, Calendar, Users, MessageCircle, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { default as api } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface CounsellorProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  specialization: string;
  experience: string;
  rating: number;
  totalReviews: number;
  isApproved: boolean;
  availability?: any[]; // Add availability if needed
  notifications?: any; // Add notifications if needed
}

const CounsellorSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<CounsellorProfile>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
    specialization: "",
    experience: "",
    rating: 0,
    totalReviews: 0,
    isApproved: false,
    availability: [],
    notifications: {}
  });
  const [originalProfile, setOriginalProfile] = useState<CounsellorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", path: "/counsellor/dashboard" },
    { icon: <Calendar className="w-5 h-5" />, label: "Schedule", path: "/counsellor/schedule" },
    { icon: <Users className="w-5 h-5" />, label: "My Clients", path: "/counsellor/clients" },
    { icon: <MessageCircle className="w-5 h-5" />, label: "Messages", path: "/counsellor/messages" },
    { icon: <Settings className="w-5 h-5" />, label: "Settings", path: "/counsellor/settings" },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/counsellor/profile');
        const profileData = {
          firstName: response.data.firstName || "",
          lastName: response.data.lastName || "",
          email: response.data.email || "",
          phone: response.data.phone || "",
          bio: response.data.bio || "",
          specialization: response.data.specialization || "",
          experience: response.data.experience || "",
          rating: response.data.rating || 0,
          totalReviews: response.data.totalReviews || 0,
          isApproved: response.data.isApproved || false,
          availability: response.data.availability || [],
          notifications: response.data.notifications || {}
        };
        setProfile(profileData);
        setOriginalProfile(profileData);
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Set empty profile data if API fails - no hardcoded defaults
        const defaultProfile = {
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
          email: user?.email || "",
          phone: "",
          bio: "",
          specialization: "",
          experience: "",
          rating: 0,
          totalReviews: 0,
          isApproved: false,
          availability: [],
          notifications: {}
        };
        setProfile(defaultProfile);
        setOriginalProfile(defaultProfile);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await api.put('/counsellor/profile', profile);
      // Update local state with the saved data from server
      const savedProfile = {
        firstName: response.data.firstName || "",
        lastName: response.data.lastName || "",
        email: response.data.email || "",
        phone: response.data.phone || "",
        bio: response.data.bio || "",
        specialization: response.data.specialization || "",
        experience: response.data.experience || "",
        rating: response.data.rating || 0,
        totalReviews: response.data.totalReviews || 0,
        isApproved: response.data.isApproved || false,
        availability: response.data.availability || [],
        notifications: response.data.notifications || {}
      };
      setProfile(savedProfile);
      setOriginalProfile(savedProfile);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = 'Failed to update profile. Please try again.';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof CounsellorProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const hasChanges = () => {
    if (!originalProfile) return false;
    return JSON.stringify(profile) !== JSON.stringify(originalProfile);
  };

  const handleReset = () => {
    if (originalProfile) {
      setProfile(originalProfile);
      setError(null);
    }
  };

  return (
    <DashboardLayout navItems={navItems} userRole="Counsellor">
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your profile and account settings</p>
          </div>
        </div>

        {/* Approval Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Account Status</h3>
                <p className="text-sm text-muted-foreground">
                  {profile.isApproved ? "Your account is approved and active" : "Your account is pending approval"}
                </p>
              </div>
              <Badge variant={profile.isApproved ? "default" : "secondary"}>
                {profile.isApproved ? "Approved" : "Pending"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="w-24 h-24 rounded-full bg-gradient-saffron flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary-foreground">
                  {profile.firstName?.[0]}{profile.lastName?.[0]}
                </span>
              </div>
              <Button variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload New Photo
              </Button>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={profile.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  type="number"
                  placeholder="Enter years of experience"
                  value={profile.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={4}
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm mb-4">
                  {error}
                </div>
              )}
              <div className="flex gap-4">
                <Button onClick={handleSave} disabled={saving || !hasChanges()} className="bg-gradient-saffron">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button onClick={handleReset} disabled={!hasChanges()} variant="outline">
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold">{profile.rating.toFixed(1)}</p>
                </div>
                <User className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                  <p className="text-2xl font-bold">{profile.totalReviews}</p>
                </div>
                <User className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Experience</p>
                  <p className="text-2xl font-bold">{profile.experience} years</p>
                </div>
                <User className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CounsellorSettings;
