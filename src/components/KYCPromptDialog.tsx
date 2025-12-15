import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface KYCPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onSkip: () => void;
}

export const KYCPromptDialog = ({ open, onOpenChange, onComplete, onSkip }: KYCPromptDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            KYC Verification Required
          </DialogTitle>
          <DialogDescription>
            To buy gold, you need to complete your KYC verification first. This is a one-time process to verify your identity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-medium">What you'll need:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>A valid ID proof (Aadhaar, PAN, Passport, etc.)</li>
              <li>A clear photo or scan of the document</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={onComplete} className="w-full">
              Complete KYC Now
            </Button>
            <Button onClick={onSkip} variant="outline" className="w-full">
              Skip for Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
