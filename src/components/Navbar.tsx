import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import barrickLogo from "@/assets/barrick-logo.png";

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-primary/30">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <img src={barrickLogo} alt="Barrick Digital Gold" className="h-8 w-8 sm:h-12 sm:w-12 object-contain" />
            <span className="font-display text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-[#c9a227] via-[#f4d03f] to-[#c9a227] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(212,175,55,0.6)]">
              Barrick Digital Gold
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <Link to="/" className="text-sm font-semibold text-white hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/auth" className="text-sm font-semibold text-white hover:text-primary transition-colors">
              Investment Plans
            </Link>
            <Link to="/auth" className="text-sm font-semibold text-white hover:text-primary transition-colors">
              Contact
            </Link>
          </div>
          
          {/* Desktop Buttons */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" asChild size="sm" className="text-xs sm:text-sm">
              <Link to="/auth">Login</Link>
            </Button>
            <Button variant="premium" asChild size="sm" className="text-xs sm:text-sm">
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden mt-4 pb-4 border-t border-primary/20 pt-4 space-y-3">
            <Link 
              to="/" 
              className="block text-sm font-semibold text-white hover:text-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/auth" 
              className="block text-sm font-semibold text-white hover:text-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Investment Plans
            </Link>
            <Link 
              to="/auth" 
              className="block text-sm font-semibold text-white hover:text-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" asChild size="sm" className="flex-1">
                <Link to="/auth">Login</Link>
              </Button>
              <Button variant="premium" asChild size="sm" className="flex-1">
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
