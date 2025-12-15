import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, MessageCircle, Copy } from "lucide-react";
import { sendChatNotification } from "@/lib/chatNotifications";

interface PaymentMethod {
  id: string;
  method_name: string;
  account_details: string;
}

interface TopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TopUpDialog = ({ open, onOpenChange, onSuccess }: TopUpDialogProps) => {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"amount" | "method" | "upload">("amount");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [minimumTopup, setMinimumTopup] = useState<number>(100);
  const { toast } = useToast();

  // Fetch minimum top-up amount when dialog opens
  useEffect(() => {
    if (open) {
      supabase
        .from("gold_settings")
        .select("minimum_topup_amount")
        .single()
        .then(({ data }) => {
          if (data) {
            setMinimumTopup(Number(data.minimum_topup_amount));
          }
        });
    }
  }, [open]);

  const handleAmountSubmit = async () => {
    const amountValue = parseFloat(amount);
    
    if (!amount || amountValue <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (amountValue < minimumTopup) {
      toast({
        title: "Below Minimum Amount",
        description: `Minimum top-up amount is ${minimumTopup.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    // Fetch payment methods
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("is_active", true);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive",
      });
      return;
    }

    setPaymentMethods(data || []);
    setStep("method");
  };

  const handleMethodSelect = async (methodId: string) => {
    if (methodId === "other") {
      // Open chat support with pre-filled message
      await openChatWithPaymentRequest();
      return;
    }
    const method = paymentMethods.find((m) => m.id === methodId);
    setSelectedMethod(method || null);
    setStep("upload");
  };

  const openChatWithPaymentRequest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please log in to contact support",
          variant: "destructive",
        });
        return;
      }

      // Get or create conversation
      let conversationId: string;
      const { data: existingConversation } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        const { data: newConversation, error } = await supabase
          .from("chat_conversations")
          .insert({
            user_id: user.id,
            subject: "Payment Method Request",
            status: "open"
          })
          .select()
          .single();

        if (error || !newConversation) {
          throw new Error("Failed to create conversation");
        }
        conversationId = newConversation.id;
      }

      // Send pre-filled message about payment method request
      const message = `Hi, I would like to top up my wallet with ${amount} but my preferred payment method is not available in the list. Could you please help me with an alternative payment option?`;
      
      await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message: message
        });

      toast({
        title: "Message Sent",
        description: "Your request has been sent to customer support. Please check the chat for a response.",
      });

      // Close dialog and trigger chat open
      handleClose();
      
      // Dispatch custom event to open chat
      window.dispatchEvent(new CustomEvent('openChatSupport'));
      
    } catch (error) {
      console.error("Error opening chat:", error);
      toast({
        title: "Error",
        description: "Failed to contact support. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!screenshot || !selectedMethod) {
      toast({
        title: "Missing information",
        description: "Please upload a screenshot",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload screenshot
      const fileName = `${user.id}/${Date.now()}_${screenshot.name}`;
      const { error: uploadError } = await supabase.storage
        .from("transaction-screenshots")
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("transaction-screenshots")
        .getPublicUrl(fileName);

      // Create transaction record
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          payment_method_id: selectedMethod.id,
          screenshot_url: publicUrl,
          status: "pending",
        });

      if (transactionError) throw transactionError;

      // Send email notification
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, email")
          .eq("user_id", user.id)
          .single();

        if (profile?.email) {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              to: profile.email,
              subject: "Top-Up Request Submitted",
              type: "topup_submitted",
              status: "pending",
              amount: parseFloat(amount),
              username: profile.username,
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      // Send chat notification
      await sendChatNotification(
        user.id,
        `Top-Up Request: You submitted a top-up request of ${parseFloat(amount).toLocaleString()} via ${selectedMethod.method_name}. Pending admin approval.`
      );

      toast({
        title: "Success!",
        description: "Your top-up request has been submitted for admin verification",
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error submitting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to submit transaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setStep("amount");
    setSelectedMethod(null);
    setScreenshot(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Top Up Wallet</DialogTitle>
          <DialogDescription>
            {step === "amount" && "Enter the amount you want to add to your wallet"}
            {step === "method" && "Select your payment method"}
            {step === "upload" && "Upload transaction screenshot"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
        {step === "amount" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={minimumTopup}
                step="0.01"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum top-up amount: {minimumTopup.toFixed(2)}
              </p>
            </div>
            <Button onClick={handleAmountSubmit} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {step === "method" && (
          <div className="space-y-4">
            <div>
              <Label>Payment Method</Label>
              <Select onValueChange={handleMethodSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.method_name}
                    </SelectItem>
                  ))}
                  <SelectItem value="other" className="border-t border-border mt-1 pt-2">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      <span>Other</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === "upload" && selectedMethod && (
          <div className="space-y-4">
            <ScrollArea className="h-auto max-h-[300px] w-full rounded-lg border">
              <div className="p-4 bg-muted">
                <h4 className="font-semibold mb-3">{selectedMethod.method_name}</h4>
                <div className="space-y-2">
                  {selectedMethod.account_details.split('\n').map((line, index) => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex === -1) {
                      return <p key={index} className="text-sm">{line}</p>;
                    }
                    const label = line.substring(0, colonIndex + 1);
                    const value = line.substring(colonIndex + 1).trim();
                    
                    const handleCopy = () => {
                      navigator.clipboard.writeText(value);
                      toast({
                        title: "Copied",
                        description: `${label.replace(':', '')} copied to clipboard`,
                      });
                    };
                    
                    return (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-muted-foreground">{label}</span>{' '}
                          <span className="text-primary font-medium">{value}</span>
                        </div>
                        <button
                          onClick={handleCopy}
                          className="p-1 hover:bg-background/50 rounded transition-colors ml-2"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Please use your username as reference when transferring.
                </p>
              </div>
            </ScrollArea>

            <div>
              <Label htmlFor="screenshot">Upload Transaction Screenshot</Label>
              <div className="mt-2">
                <Input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              {screenshot && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {screenshot.name}
                </p>
              )}
            </div>

            <div className="p-4 bg-primary/10 rounded-lg text-sm">
              <p className="font-semibold mb-2">Verification Process:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Upload a clear screenshot of your transaction</li>
                <li>Admin will verify within 24 hours</li>
                <li>Once approved, funds will be added to your wallet</li>
                <li>You'll receive a notification upon approval</li>
              </ul>
            </div>

            <Button 
              onClick={handleSubmitForApproval} 
              className="w-full"
              disabled={loading || !screenshot}
            >
              <Upload className="w-4 h-4 mr-2" />
              {loading ? "Submitting..." : "Submit for Approval"}
            </Button>
          </div>
        )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
