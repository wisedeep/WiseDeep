import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

const VerifyEmail = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [verifying, setVerifying] = useState(true);
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const verifyEmail = async () => {
            if (!token) {
                setError("Invalid verification link");
                setVerifying(false);
                return;
            }

            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/verify-email?token=${token}`
                );
                const data = await response.json();

                if (response.ok) {
                    setVerified(true);
                    toast({ title: "Success", description: data.message });
                    setTimeout(() => navigate("/login"), 3000);
                } else {
                    setError(data.message || "Verification failed");
                    toast({ title: "Error", description: data.message, variant: "destructive" });
                }
            } catch (err) {
                setError("Failed to verify email. Please try again.");
                toast({ title: "Error", description: "Failed to verify email", variant: "destructive" });
            } finally {
                setVerifying(false);
            }
        };

        verifyEmail();
    }, [token, navigate, toast]);

    const handleResendVerification = async () => {
        toast({
            title: "Info",
            description: "Please use the resend verification option from the login page"
        });
        navigate("/login");
    };

    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-warm">
                <Card className="w-full max-w-md shadow-medium">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-saffron flex items-center justify-center mb-4">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                        <CardTitle className="text-2xl">Verifying Your Email</CardTitle>
                        <CardDescription>Please wait while we verify your email address...</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (verified) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-warm p-4">
                <Card className="w-full max-w-md shadow-medium animate-slide-up">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Email Verified!</CardTitle>
                        <CardDescription>
                            Your email has been successfully verified. You can now log in to your account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            className="w-full bg-gradient-saffron hover:shadow-glow transition-smooth"
                            onClick={() => navigate("/login")}
                        >
                            Go to Login
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                            Redirecting automatically in 3 seconds...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-warm p-4">
            <Card className="w-full max-w-md shadow-medium animate-slide-up">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl">Verification Failed</CardTitle>
                    <CardDescription>{error}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                        <p className="font-medium mb-2">Possible reasons:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>The verification link has expired (24 hours)</li>
                            <li>The link has already been used</li>
                            <li>The link is invalid or corrupted</li>
                        </ul>
                    </div>
                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={handleResendVerification}
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        Request New Verification Email
                    </Button>
                    <Button
                        className="w-full"
                        onClick={() => navigate("/login")}
                    >
                        Go to Login
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default VerifyEmail;
