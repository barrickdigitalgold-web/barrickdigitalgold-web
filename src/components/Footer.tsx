import { useState } from "react";
import { MapPin } from "lucide-react";
import barrickLogo from "@/assets/barrick-logo.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Footer = () => {
  const [showAboutDialog, setShowAboutDialog] = useState(false);

  return (
    <>
      <footer className="bg-black text-white py-6 sm:py-8 border-t border-primary/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={barrickLogo} alt="Barrick Digital Gold" className="h-8 w-8 sm:h-12 sm:w-12 object-contain" />
              <span className="font-display text-base sm:text-xl font-bold bg-gradient-to-r from-[#c9a227] via-[#f4d03f] to-[#c9a227] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(212,175,55,0.6)]">
                Barrick Digital Gold
              </span>
            </div>
            
            <p className="text-xs sm:text-sm font-medium text-[#c9a227]">
              Premium digital gold platform
            </p>
            
            <button 
              onClick={() => setShowAboutDialog(true)}
              className="text-left text-xs sm:text-sm font-bold text-[#c9a227] hover:text-[#f4d03f] transition-colors"
            >
              About Us
            </button>
            
            <div className="flex items-start gap-2 text-xs sm:text-sm">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-[#c9a227] mt-0.5 shrink-0" />
              <span className="text-white/80 font-medium">Gold Chauk, Dubai, UAE</span>
            </div>
            
            <div className="border-t border-primary/30 pt-3 sm:pt-4 mt-2 text-center text-xs sm:text-sm text-white/70">
              <p>&copy; {new Date().getFullYear()} Barrick Digital Gold. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      <Dialog open={showAboutDialog} onOpenChange={setShowAboutDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-primary">About Us</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-secondary-foreground/90 leading-relaxed">
            <p>
              Barrick is a leading global gold and copper producer operating across more than 17 countries, 
              committed to long life assets, sustainable growth, and responsible mining. With a focus on safety, 
              integrity, and strong community partnerships, Barrick continues to create long term value through 
              world class operations and ongoing development.
            </p>
            <p>
              Alongside this foundation, our platform offers a trusted digital gold service backed by years of 
              experience. You can buy gold confidently at competitive prices and store it securely for a lifetime 
              – delivering reliability and quality worthy of being called gold.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
