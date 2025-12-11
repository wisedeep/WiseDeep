import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast({ title: "Error", description: "Please enter your email address", variant: "destructive" });
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast({ title: "Error", description: "Please enter a valid email address", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setEmailSent(true);
                toast({ title: "Success", description: data.message });
            } else {
                toast({ title: "Error", description: data.message, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to send reset email. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-warm p-4">
                <div className="w-full max-w-md">
                    <Card className="shadow-medium animate-slide-up">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-saffron flex items-center justify-center mb-4">
                                <Mail className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle className="text-2xl">Check Your Email</CardTitle>
                            <CardDescription>
                                We've sent a password reset link to <strong>{email}</strong>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                                <p className="font-medium mb-2">📧 Next Steps:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Check your inbox for the reset link</li>
                                    <li>The link will expire in 1 hour</li>
                                    <li>Check spam folder if you don't see it</li>
                                </ul>
                            </div>
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => navigate("/login")}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Login
                            </Button>
                            <button
                                onClick={() => setEmailSent(false)}
                                className="w-full text-sm text-primary hover:underline"
                            >
                                Didn't receive the email? Try again
                            </button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
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
                    <p className="text-muted-foreground">Reset your password</p>
                </div>

                <Card className="shadow-medium animate-slide-up">
                    <CardHeader>
                        <CardTitle className="text-2xl">Forgot Password?</CardTitle>
                        <CardDescription>
                            Enter your email address and we'll send you a link to reset your password
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="transition-smooth"
                                    autoFocus
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-saffron hover:shadow-glow transition-smooth"
                                disabled={loading}
                            >
                                {loading ? "Sending..." : "Send Reset Link"}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => navigate("/login")}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Login
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ForgotPassword;
