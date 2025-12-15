import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FrozenAccountDialog } from "@/components/FrozenAccountDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import barrickLogo from "@/assets/barrick-logo.png";

const signupSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
  country: z.string().min(1, "Please select a country"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").max(20),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Signup form
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupCountry, setSignupCountry] = useState("");
  const [signupPhoneNumber, setSignupPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Scroll states
  const signupFormRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  
  // Password reset
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Signup OTP verification
  const [showSignupOtpDialog, setShowSignupOtpDialog] = useState(false);
  const [signupOtp, setSignupOtp] = useState("");
  const [pendingSignupEmail, setPendingSignupEmail] = useState("");

  // State for frozen/deactivated account
  const [showFrozenDialog, setShowFrozenDialog] = useState(false);
  const [frozenUserId, setFrozenUserId] = useState<string | null>(null);
  const [accountStatusMessage, setAccountStatusMessage] = useState("");

  useEffect(() => {
    const checkUserRoleAndRedirect = async (userId: string, skipFrozenCheck = false) => {
      // Check account status first
      if (!skipFrozenCheck) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_status, is_hidden')
          .eq('user_id', userId)
          .single();
        
        const accountStatus = profile?.account_status || 'active';
        
        // Handle deactivated accounts - cannot log in at all
        if (accountStatus === 'deactivated') {
          await supabase.auth.signOut();
          toast({
            title: "Account Deactivated",
            description: "Your account has been deactivated. Please contact Customer Service.",
            variant: "destructive",
          });
          return;
        }
        
        // Handle frozen accounts - show dialog with chat support
        if (accountStatus === 'frozen' || profile?.is_hidden) {
          setFrozenUserId(userId);
          setAccountStatusMessage("Your account is frozen. If you want to unfreeze your account, please contact Customer Service. Customer Service will guide you on how to resolve this issue and explain why your account is in this status.");
          setShowFrozenDialog(true);
          await supabase.auth.signOut();
          return;
        }
      }

      const { data } = await supabase
        .rpc("has_role", { _user_id: userId, _role: "admin" });
      
      if (data) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    };

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkUserRoleAndRedirect(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && event === 'SIGNED_IN') {
        setTimeout(() => {
          checkUserRoleAndRedirect(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Check scroll position
  const checkScrollPosition = () => {
    if (signupFormRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = signupFormRef.current;
      setCanScrollUp(scrollTop > 0);
      setCanScrollDown(scrollTop < scrollHeight - clientHeight - 10);
    }
  };

  useEffect(() => {
    const formElement = signupFormRef.current;
    if (formElement) {
      checkScrollPosition();
      formElement.addEventListener('scroll', checkScrollPosition);
      return () => formElement.removeEventListener('scroll', checkScrollPosition);
    }
  }, []);

  const scrollUp = () => {
    if (signupFormRef.current) {
      signupFormRef.current.scrollBy({ top: -200, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    if (signupFormRef.current) {
      signupFormRef.current.scrollBy({ top: 200, behavior: 'smooth' });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = signupSchema.parse({
        firstName: signupFirstName,
        lastName: signupLastName,
        username: signupUsername,
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        country: signupCountry,
        phoneNumber: signupPhoneNumber,
      });

      setLoading(true);

      const { error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            username: validatedData.username,
            country: validatedData.country,
            phoneNumber: validatedData.phoneNumber,
          },
        },
      });

      if (error) throw error;

      // Show OTP verification dialog
      setPendingSignupEmail(validatedData.email);
      setShowSignupOtpDialog(true);
      
      toast({
        title: "OTP Sent!",
        description: "Please check your email for the verification code.",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to create account",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignupOtp = async () => {
    if (!signupOtp || signupOtp.length !== 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid 6-digit OTP",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: pendingSignupEmail,
        token: signupOtp,
        type: 'signup',
      });

      if (error) throw error;

      setShowSignupOtpDialog(false);
      setSignupOtp("");
      setPendingSignupEmail("");
      
      toast({
        title: "Email Verified!",
        description: "Your account has been verified successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to verify OTP",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignupOtp = async () => {
    if (!pendingSignupEmail) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingSignupEmail,
      });

      if (error) throw error;

      toast({
        title: "OTP Resent",
        description: "A new verification code has been sent to your email.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to resend OTP",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = loginSchema.parse({
        email: loginEmail,
        password: loginPassword,
      });

      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        
        if (newFailedAttempts >= 3) {
          // Send OTP after 3 failed attempts
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            validatedData.email,
            { redirectTo: `${window.location.origin}/auth` }
          );
          
          if (!resetError) {
            setResetEmail(validatedData.email);
            setShowOtpDialog(true);
            toast({
              title: "OTP Sent",
              description: "You have entered the wrong password multiple times. An OTP has been sent to your registered email. Use that OTP to log in.",
            });
          }
          setFailedAttempts(0);
        }
        throw error;
      }

      setFailedAttempts(0);
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Invalid email or password",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your email address",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      setShowForgotPassword(false);
      setShowOtpDialog(true);
      toast({
        title: "OTP Sent",
        description: "An OTP has been sent to your email. Please check your inbox.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send OTP",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid 6-digit OTP",
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 6 characters",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: resetEmail,
        token: otp,
        type: 'recovery',
      });

      if (error) throw error;

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setShowOtpDialog(false);
      setOtp("");
      setNewPassword("");
      setResetEmail("");
      
      toast({
        title: "Success",
        description: "Password reset successfully. You can now login with your new password.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to verify OTP",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-navy flex items-center justify-center p-4 py-8">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center px-4 sm:px-6">
          <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 overflow-hidden">
            <img src={barrickLogo} alt="Barrick Digital Gold" className="h-10 w-10 sm:h-14 sm:w-14 object-contain" />
          </div>
          <CardTitle className="font-display text-xl sm:text-2xl md:text-3xl text-primary">Barrick Digital Gold</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Digital Gold Platform</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="text-xs sm:text-sm">Login</TabsTrigger>
              <TabsTrigger value="signup" className="text-xs sm:text-sm">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" variant="premium" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(loginEmail);
                    setShowForgotPassword(true);
                  }}
                  className="text-sm text-primary hover:underline w-full text-center mt-2"
                >
                  Forgot Password?
                </button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="relative">
              <div 
                ref={signupFormRef}
                className="max-h-[350px] sm:max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent"
                onScroll={checkScrollPosition}
              >
                <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-firstname">First Name</Label>
                  <Input
                    id="signup-firstname"
                    type="text"
                    placeholder="Enter your first name"
                    value={signupFirstName}
                    onChange={(e) => setSignupFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-lastname">Last Name</Label>
                  <Input
                    id="signup-lastname"
                    type="text"
                    placeholder="Enter your last name"
                    value={signupLastName}
                    onChange={(e) => setSignupLastName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="Choose a username"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Create Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-country">Country</Label>
                  <Select value={signupCountry} onValueChange={setSignupCountry} required>
                    <SelectTrigger id="signup-country">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50 max-h-[300px]">
                      <SelectItem value="Afghanistan">Afghanistan</SelectItem>
                      <SelectItem value="Albania">Albania</SelectItem>
                      <SelectItem value="Algeria">Algeria</SelectItem>
                      <SelectItem value="Andorra">Andorra</SelectItem>
                      <SelectItem value="Angola">Angola</SelectItem>
                      <SelectItem value="Antigua and Barbuda">Antigua and Barbuda</SelectItem>
                      <SelectItem value="Argentina">Argentina</SelectItem>
                      <SelectItem value="Armenia">Armenia</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                      <SelectItem value="Austria">Austria</SelectItem>
                      <SelectItem value="Azerbaijan">Azerbaijan</SelectItem>
                      <SelectItem value="Bahamas">Bahamas</SelectItem>
                      <SelectItem value="Bahrain">Bahrain</SelectItem>
                      <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                      <SelectItem value="Barbados">Barbados</SelectItem>
                      <SelectItem value="Belarus">Belarus</SelectItem>
                      <SelectItem value="Belgium">Belgium</SelectItem>
                      <SelectItem value="Belize">Belize</SelectItem>
                      <SelectItem value="Benin">Benin</SelectItem>
                      <SelectItem value="Bhutan">Bhutan</SelectItem>
                      <SelectItem value="Bolivia">Bolivia</SelectItem>
                      <SelectItem value="Bosnia and Herzegovina">Bosnia and Herzegovina</SelectItem>
                      <SelectItem value="Botswana">Botswana</SelectItem>
                      <SelectItem value="Brazil">Brazil</SelectItem>
                      <SelectItem value="Brunei">Brunei</SelectItem>
                      <SelectItem value="Bulgaria">Bulgaria</SelectItem>
                      <SelectItem value="Burkina Faso">Burkina Faso</SelectItem>
                      <SelectItem value="Burundi">Burundi</SelectItem>
                      <SelectItem value="Cambodia">Cambodia</SelectItem>
                      <SelectItem value="Cameroon">Cameroon</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="Cape Verde">Cape Verde</SelectItem>
                      <SelectItem value="Central African Republic">Central African Republic</SelectItem>
                      <SelectItem value="Chad">Chad</SelectItem>
                      <SelectItem value="Chile">Chile</SelectItem>
                      <SelectItem value="China">China</SelectItem>
                      <SelectItem value="Colombia">Colombia</SelectItem>
                      <SelectItem value="Comoros">Comoros</SelectItem>
                      <SelectItem value="Congo">Congo</SelectItem>
                      <SelectItem value="Costa Rica">Costa Rica</SelectItem>
                      <SelectItem value="Croatia">Croatia</SelectItem>
                      <SelectItem value="Cuba">Cuba</SelectItem>
                      <SelectItem value="Cyprus">Cyprus</SelectItem>
                      <SelectItem value="Czech Republic">Czech Republic</SelectItem>
                      <SelectItem value="Denmark">Denmark</SelectItem>
                      <SelectItem value="Djibouti">Djibouti</SelectItem>
                      <SelectItem value="Dominica">Dominica</SelectItem>
                      <SelectItem value="Dominican Republic">Dominican Republic</SelectItem>
                      <SelectItem value="East Timor">East Timor</SelectItem>
                      <SelectItem value="Ecuador">Ecuador</SelectItem>
                      <SelectItem value="Egypt">Egypt</SelectItem>
                      <SelectItem value="El Salvador">El Salvador</SelectItem>
                      <SelectItem value="Equatorial Guinea">Equatorial Guinea</SelectItem>
                      <SelectItem value="Eritrea">Eritrea</SelectItem>
                      <SelectItem value="Estonia">Estonia</SelectItem>
                      <SelectItem value="Ethiopia">Ethiopia</SelectItem>
                      <SelectItem value="Fiji">Fiji</SelectItem>
                      <SelectItem value="Finland">Finland</SelectItem>
                      <SelectItem value="France">France</SelectItem>
                      <SelectItem value="Gabon">Gabon</SelectItem>
                      <SelectItem value="Gambia">Gambia</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Germany">Germany</SelectItem>
                      <SelectItem value="Ghana">Ghana</SelectItem>
                      <SelectItem value="Greece">Greece</SelectItem>
                      <SelectItem value="Grenada">Grenada</SelectItem>
                      <SelectItem value="Guatemala">Guatemala</SelectItem>
                      <SelectItem value="Guinea">Guinea</SelectItem>
                      <SelectItem value="Guinea-Bissau">Guinea-Bissau</SelectItem>
                      <SelectItem value="Guyana">Guyana</SelectItem>
                      <SelectItem value="Haiti">Haiti</SelectItem>
                      <SelectItem value="Honduras">Honduras</SelectItem>
                      <SelectItem value="Hungary">Hungary</SelectItem>
                      <SelectItem value="Iceland">Iceland</SelectItem>
                      <SelectItem value="India">India</SelectItem>
                      <SelectItem value="Indonesia">Indonesia</SelectItem>
                      <SelectItem value="Iran">Iran</SelectItem>
                      <SelectItem value="Iraq">Iraq</SelectItem>
                      <SelectItem value="Ireland">Ireland</SelectItem>
                      <SelectItem value="Israel">Israel</SelectItem>
                      <SelectItem value="Italy">Italy</SelectItem>
                      <SelectItem value="Ivory Coast">Ivory Coast</SelectItem>
                      <SelectItem value="Jamaica">Jamaica</SelectItem>
                      <SelectItem value="Japan">Japan</SelectItem>
                      <SelectItem value="Jordan">Jordan</SelectItem>
                      <SelectItem value="Kazakhstan">Kazakhstan</SelectItem>
                      <SelectItem value="Kenya">Kenya</SelectItem>
                      <SelectItem value="Kiribati">Kiribati</SelectItem>
                      <SelectItem value="North Korea">North Korea</SelectItem>
                      <SelectItem value="South Korea">South Korea</SelectItem>
                      <SelectItem value="Kuwait">Kuwait</SelectItem>
                      <SelectItem value="Kyrgyzstan">Kyrgyzstan</SelectItem>
                      <SelectItem value="Laos">Laos</SelectItem>
                      <SelectItem value="Latvia">Latvia</SelectItem>
                      <SelectItem value="Lebanon">Lebanon</SelectItem>
                      <SelectItem value="Lesotho">Lesotho</SelectItem>
                      <SelectItem value="Liberia">Liberia</SelectItem>
                      <SelectItem value="Libya">Libya</SelectItem>
                      <SelectItem value="Liechtenstein">Liechtenstein</SelectItem>
                      <SelectItem value="Lithuania">Lithuania</SelectItem>
                      <SelectItem value="Luxembourg">Luxembourg</SelectItem>
                      <SelectItem value="Macedonia">Macedonia</SelectItem>
                      <SelectItem value="Madagascar">Madagascar</SelectItem>
                      <SelectItem value="Malawi">Malawi</SelectItem>
                      <SelectItem value="Malaysia">Malaysia</SelectItem>
                      <SelectItem value="Maldives">Maldives</SelectItem>
                      <SelectItem value="Mali">Mali</SelectItem>
                      <SelectItem value="Malta">Malta</SelectItem>
                      <SelectItem value="Marshall Islands">Marshall Islands</SelectItem>
                      <SelectItem value="Mauritania">Mauritania</SelectItem>
                      <SelectItem value="Mauritius">Mauritius</SelectItem>
                      <SelectItem value="Mexico">Mexico</SelectItem>
                      <SelectItem value="Micronesia">Micronesia</SelectItem>
                      <SelectItem value="Moldova">Moldova</SelectItem>
                      <SelectItem value="Monaco">Monaco</SelectItem>
                      <SelectItem value="Mongolia">Mongolia</SelectItem>
                      <SelectItem value="Montenegro">Montenegro</SelectItem>
                      <SelectItem value="Morocco">Morocco</SelectItem>
                      <SelectItem value="Mozambique">Mozambique</SelectItem>
                      <SelectItem value="Myanmar">Myanmar</SelectItem>
                      <SelectItem value="Namibia">Namibia</SelectItem>
                      <SelectItem value="Nauru">Nauru</SelectItem>
                      <SelectItem value="Nepal">Nepal</SelectItem>
                      <SelectItem value="Netherlands">Netherlands</SelectItem>
                      <SelectItem value="New Zealand">New Zealand</SelectItem>
                      <SelectItem value="Nicaragua">Nicaragua</SelectItem>
                      <SelectItem value="Niger">Niger</SelectItem>
                      <SelectItem value="Nigeria">Nigeria</SelectItem>
                      <SelectItem value="Norway">Norway</SelectItem>
                      <SelectItem value="Oman">Oman</SelectItem>
                      <SelectItem value="Pakistan">Pakistan</SelectItem>
                      <SelectItem value="Palau">Palau</SelectItem>
                      <SelectItem value="Palestine">Palestine</SelectItem>
                      <SelectItem value="Panama">Panama</SelectItem>
                      <SelectItem value="Papua New Guinea">Papua New Guinea</SelectItem>
                      <SelectItem value="Paraguay">Paraguay</SelectItem>
                      <SelectItem value="Peru">Peru</SelectItem>
                      <SelectItem value="Philippines">Philippines</SelectItem>
                      <SelectItem value="Poland">Poland</SelectItem>
                      <SelectItem value="Portugal">Portugal</SelectItem>
                      <SelectItem value="Qatar">Qatar</SelectItem>
                      <SelectItem value="Romania">Romania</SelectItem>
                      <SelectItem value="Russia">Russia</SelectItem>
                      <SelectItem value="Rwanda">Rwanda</SelectItem>
                      <SelectItem value="Saint Kitts and Nevis">Saint Kitts and Nevis</SelectItem>
                      <SelectItem value="Saint Lucia">Saint Lucia</SelectItem>
                      <SelectItem value="Saint Vincent and the Grenadines">Saint Vincent and the Grenadines</SelectItem>
                      <SelectItem value="Samoa">Samoa</SelectItem>
                      <SelectItem value="San Marino">San Marino</SelectItem>
                      <SelectItem value="Sao Tome and Principe">Sao Tome and Principe</SelectItem>
                      <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                      <SelectItem value="Senegal">Senegal</SelectItem>
                      <SelectItem value="Serbia">Serbia</SelectItem>
                      <SelectItem value="Seychelles">Seychelles</SelectItem>
                      <SelectItem value="Sierra Leone">Sierra Leone</SelectItem>
                      <SelectItem value="Singapore">Singapore</SelectItem>
                      <SelectItem value="Slovakia">Slovakia</SelectItem>
                      <SelectItem value="Slovenia">Slovenia</SelectItem>
                      <SelectItem value="Solomon Islands">Solomon Islands</SelectItem>
                      <SelectItem value="Somalia">Somalia</SelectItem>
                      <SelectItem value="South Africa">South Africa</SelectItem>
                      <SelectItem value="South Sudan">South Sudan</SelectItem>
                      <SelectItem value="Spain">Spain</SelectItem>
                      <SelectItem value="Sri Lanka">Sri Lanka</SelectItem>
                      <SelectItem value="Sudan">Sudan</SelectItem>
                      <SelectItem value="Suriname">Suriname</SelectItem>
                      <SelectItem value="Swaziland">Swaziland</SelectItem>
                      <SelectItem value="Sweden">Sweden</SelectItem>
                      <SelectItem value="Switzerland">Switzerland</SelectItem>
                      <SelectItem value="Syria">Syria</SelectItem>
                      <SelectItem value="Taiwan">Taiwan</SelectItem>
                      <SelectItem value="Tajikistan">Tajikistan</SelectItem>
                      <SelectItem value="Tanzania">Tanzania</SelectItem>
                      <SelectItem value="Thailand">Thailand</SelectItem>
                      <SelectItem value="Togo">Togo</SelectItem>
                      <SelectItem value="Tonga">Tonga</SelectItem>
                      <SelectItem value="Trinidad and Tobago">Trinidad and Tobago</SelectItem>
                      <SelectItem value="Tunisia">Tunisia</SelectItem>
                      <SelectItem value="Turkey">Turkey</SelectItem>
                      <SelectItem value="Turkmenistan">Turkmenistan</SelectItem>
                      <SelectItem value="Tuvalu">Tuvalu</SelectItem>
                      <SelectItem value="Uganda">Uganda</SelectItem>
                      <SelectItem value="Ukraine">Ukraine</SelectItem>
                      <SelectItem value="United Arab Emirates">United Arab Emirates</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="Uruguay">Uruguay</SelectItem>
                      <SelectItem value="Uzbekistan">Uzbekistan</SelectItem>
                      <SelectItem value="Vanuatu">Vanuatu</SelectItem>
                      <SelectItem value="Vatican City">Vatican City</SelectItem>
                      <SelectItem value="Venezuela">Venezuela</SelectItem>
                      <SelectItem value="Vietnam">Vietnam</SelectItem>
                      <SelectItem value="Yemen">Yemen</SelectItem>
                      <SelectItem value="Zambia">Zambia</SelectItem>
                      <SelectItem value="Zimbabwe">Zimbabwe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={signupPhoneNumber}
                    onChange={(e) => setSignupPhoneNumber(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" variant="premium" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
              </div>
              
              {/* Scroll Buttons */}
              {canScrollUp && (
                <button
                  type="button"
                  onClick={scrollUp}
                  className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all"
                  aria-label="Scroll up"
                >
                  <ChevronUp className="h-5 w-5" />
                </button>
              )}
              
              {canScrollDown && (
                <button
                  type="button"
                  onClick={scrollDown}
                  className="absolute bottom-2 right-2 z-10 w-8 h-8 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all"
                  aria-label="Scroll down"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you an OTP to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleForgotPassword} 
              className="w-full" 
              variant="premium"
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify OTP</DialogTitle>
            <DialogDescription>
              Enter the 6-digit OTP sent to {resetEmail} and create a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">OTP</Label>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button 
              onClick={handleVerifyOtp} 
              className="w-full" 
              variant="premium"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Reset Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signup OTP Verification Dialog */}
      <Dialog open={showSignupOtpDialog} onOpenChange={setShowSignupOtpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Your Email</DialogTitle>
            <DialogDescription>
              Enter the 6-digit OTP sent to {pendingSignupEmail} to verify your email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-otp">OTP</Label>
              <InputOTP
                maxLength={6}
                value={signupOtp}
                onChange={setSignupOtp}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button 
              onClick={handleVerifySignupOtp} 
              className="w-full" 
              variant="premium"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Email"}
            </Button>
            <button
              type="button"
              onClick={handleResendSignupOtp}
              disabled={loading}
              className="text-sm text-primary hover:underline w-full text-center"
            >
              Didn't receive the code? Resend OTP
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Frozen Account Dialog with Chat Support */}
      <FrozenAccountDialog 
        open={showFrozenDialog} 
        onOpenChange={setShowFrozenDialog}
        userId={frozenUserId}
      />
    </div>
  );
};

export default Auth;