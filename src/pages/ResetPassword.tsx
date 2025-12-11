import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const ResetPassword = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validatingToken, setValidatingToken] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

    // Password strength calculation
    const getPasswordStrength = (pass: string) => {
        let strength = 0;
        if (pass.length >= 8) strength++;
        if (pass.length >= 12) strength++;
        if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength++;
        if (/\d/.test(pass)) strength++;
        if (/[^a-zA-Z\d]/.test(pass)) strength++;
        return strength;
    };

    const passwordStrength = getPasswordStrength(password);
    const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500"];

    // Validate token on mount
    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                toast({ title: "Error", description: "Invalid reset link", variant: "destructive" });
                navigate("/login");
                return;
            }

            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/check-reset-token/${token}`
                );
                const data = await response.json();

                if (response.ok && data.valid) {
                    setTokenValid(true);
                } else {
                    toast({ title: "Error", description: data.message || "Invalid or expired reset link", variant: "destructive" });
                    setTimeout(() => navigate("/forgot-password"), 2000);
                }
            } catch (error) {
                toast({ title: "Error", description: "Failed to validate reset link", variant: "destructive" });
                setTimeout(() => navigate("/forgot-password"), 2000);
            } finally {
                setValidatingToken(false);
            }
        };

        validateToken();
    }, [token, navigate, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
            return;
        }

        if (password.length < 6) {
            toast({ title: "Error", description: "Password must be at least 6 characters long", variant: "destructive" });
            return;
        }

        if (password !== confirmPassword) {
            toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setResetSuccess(true);
                toast({ title: "Success", description: data.message });
                setTimeout(() => navigate("/login"), 3000);
            } else {
                toast({ title: "Error", description: data.message, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to reset password. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (validatingToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-warm">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Validating reset link...</p>
                </div>
            </div>
        );
    }

    if (resetSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-warm p-4">
                <Card className="w-full max-w-md shadow-medium animate-slide-up">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Password Reset Successful!</CardTitle>
                        <CardDescription>
                            Your password has been changed successfully. You can now log in with your new password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-sm text-muted-foreground">
                            Redirecting to login page in 3 seconds...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!tokenValid) {
        return null; // Will redirect
    }

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
                    <p className="text-muted-foreground">Create a new password</p>
                </div>

                <Card className="shadow-medium animate-slide-up">
                    <CardHeader>
                        <CardTitle className="text-2xl">Reset Password</CardTitle>
                        <CardDescription>
                            Enter your new password below
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {password && (
                                    <div className="space-y-2">
                                        <div className="flex gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1 flex-1 rounded-full transition-all ${i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-gray-200"
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Strength: <span className="font-medium">{strengthLabels[passwordStrength - 1] || "Very Weak"}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-500">Passwords do not match</p>
                                )}
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                                <p className="font-medium mb-1">Password Requirements:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    <li>At least 6 characters long</li>
                                    <li>Mix of uppercase and lowercase letters (recommended)</li>
                                    <li>Include numbers and special characters (recommended)</li>
                                </ul>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-saffron hover:shadow-glow transition-smooth"
                                disabled={loading || password !== confirmPassword || !password}
                            >
                                <Lock className="w-4 h-4 mr-2" />
                                {loading ? "Resetting Password..." : "Reset Password"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ResetPassword;
