import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface ProfileData {
  username: string;
  country: string;
  profile_picture: string | null;
  date_of_birth: string | null;
  kyc_status: string;
  kyc_proof_type: string | null;
  kyc_proof_url: string | null;
  account_number: string | null;
}

const KYC_PROOF_TYPES = [
  "Aadhaar Card",
  "PAN Card",
  "Passport",
  "Driving License",
  "Voter ID"
];

export const UserProfileDialog = ({ open, onOpenChange, userId }: UserProfileDialogProps) => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [kycProofType, setKycProofType] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [kycProof, setKycProof] = useState<File | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && userId) {
      fetchProfile();
    }
  }, [open, userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      
      setProfileData(data);
      setUsername(data.username || "");
      setDateOfBirth(data.date_of_birth || "");
      setKycProofType(data.kyc_proof_type || "");
      setAccountNumber(data.account_number || "");
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
    }
  };

  const handleKycProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKycProof(file);
    }
  };

  const uploadFile = async (file: File, bucket: string, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmitAll = async () => {
    if (!username || !dateOfBirth || !kycProofType || !accountNumber || (!profileData?.profile_picture && !profilePicture) || (!profileData?.kyc_proof_url && !kycProof)) {
      toast({
        title: "Error",
        description: "All fields are mandatory. Please fill in all information.",
        variant: "destructive",
      });
      return;
    }

    if (profileData?.kyc_status === 'submitted' || profileData?.kyc_status === 'verified') {
      toast({
        title: "Profile Locked",
        description: "Profile cannot be updated once KYC is submitted.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let profilePictureUrl = profileData?.profile_picture;
      let kycProofUrl = profileData?.kyc_proof_url;
      
      if (profilePicture) {
        profilePictureUrl = await uploadFile(profilePicture, 'profile-pictures', 'avatars');
      }

      if (kycProof) {
        kycProofUrl = await uploadFile(kycProof, 'kyc-documents', 'proofs');
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          date_of_birth: dateOfBirth,
          profile_picture: profilePictureUrl,
          kyc_proof_type: kycProofType,
          kyc_proof_url: kycProofUrl,
          kyc_status: 'submitted',
          account_number: accountNumber,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile and KYC submitted successfully",
      });

      fetchProfile();
      setProfilePicture(null);
      setKycProof(null);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isProfileComplete = () => {
    return !!(
      profileData?.username &&
      profileData?.date_of_birth &&
      profileData?.kyc_proof_type &&
      profileData?.account_number &&
      profileData?.profile_picture &&
      profileData?.kyc_proof_url
    );
  };

  const getVerificationBadge = () => {
    const isComplete = isProfileComplete();
    
    if (isComplete) {
      return (
        <Badge 
          variant="default"
          className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/30"
        >
          VERIFIED
        </Badge>
      );
    }
    
    return (
      <Badge 
        variant="destructive"
        className="bg-red-500/20 text-red-600 border-red-500/30 hover:bg-red-500/30"
      >
        FAILED
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Verification Status */}
          <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg border">
            <h3 className="text-lg font-semibold">Account Verification</h3>
            {getVerificationBadge()}
          </div>
          
          {isProfileComplete() && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800">
              Profile Update Complete
            </div>
          )}

          {(profileData?.kyc_status === 'submitted' || profileData?.kyc_status === 'verified') && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800">
              Profile is locked once KYC is submitted. Contact support for changes.
            </div>
          )}

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={profileData?.kyc_status === 'submitted' || profileData?.kyc_status === 'verified'}
              required
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth *</Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={profileData?.kyc_status === 'submitted' || profileData?.kyc_status === 'verified'}
              required
            />
          </div>

          {/* Profile Picture */}
          <div className="space-y-2">
            <Label htmlFor="profile-picture">Profile Picture *</Label>
            {profileData?.profile_picture && (
              <div className="mb-2">
                <img
                  src={profileData.profile_picture}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
              </div>
            )}
            <Input
              id="profile-picture"
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              disabled={profileData?.kyc_status === 'submitted' || profileData?.kyc_status === 'verified'}
              required={!profileData?.profile_picture}
            />
          </div>

          {/* KYC Proof Type */}
          <div className="space-y-2">
            <Label htmlFor="kyc-proof-type">KYC Document Type *</Label>
            <select
              id="kyc-proof-type"
              value={kycProofType}
              onChange={(e) => setKycProofType(e.target.value)}
              className="w-full border rounded-md px-3 py-2 bg-background"
              disabled={profileData?.kyc_status === 'submitted' || profileData?.kyc_status === 'verified'}
              required
            >
              <option value="">Select document type</option>
              {KYC_PROOF_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* KYC Document */}
          <div className="space-y-2">
            <Label htmlFor="kyc-proof">KYC Document *</Label>
            {profileData?.kyc_proof_url && (
              <div className="mb-2">
                <button
                  onClick={async () => {
                    const pathParts = profileData.kyc_proof_url!.split('/');
                    const filePath = pathParts.slice(pathParts.indexOf('proofs')).join('/');
                    const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(filePath, 60);
                    if (data?.signedUrl) {
                      const link = document.createElement('a');
                      link.href = data.signedUrl;
                      link.download = 'kyc-document';
                      link.click();
                    }
                  }}
                  className="text-primary hover:underline text-sm"
                >
                  Download Current KYC Document
                </button>
              </div>
            )}
            <Input
              id="kyc-proof"
              type="file"
              accept="image/*,.pdf"
              onChange={handleKycProofChange}
              disabled={profileData?.kyc_status === 'submitted' || profileData?.kyc_status === 'verified'}
              required={!profileData?.kyc_proof_url}
            />
            <p className="text-sm text-muted-foreground">
              Upload a clear copy of your government-issued ID
            </p>
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <Label htmlFor="account-number">Bank Account Number *</Label>
            <Textarea
              id="account-number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter your bank account number"
              disabled={profileData?.kyc_status === 'submitted' || profileData?.kyc_status === 'verified'}
              required
              className="min-h-[100px]"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmitAll}
            disabled={
              loading ||
              !username ||
              !dateOfBirth ||
              !kycProofType ||
              !accountNumber ||
              (!profileData?.profile_picture && !profilePicture) ||
              (!profileData?.kyc_proof_url && !kycProof) ||
              profileData?.kyc_status === 'submitted' ||
              profileData?.kyc_status === 'verified'
            }
            className="w-full"
          >
            {loading ? "Saving..." : "Save All Changes"}
          </Button>

          {(profileData?.kyc_status === 'submitted' || profileData?.kyc_status === 'verified') && (
            <p className="text-sm text-muted-foreground text-center">
              Profile cannot be edited after KYC submission
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};