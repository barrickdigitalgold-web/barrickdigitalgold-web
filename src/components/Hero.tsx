import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroGold from "@/assets/hero-gold-new.jpg";
import { LiveGoldPriceSelector } from "@/components/LiveGoldPriceSelector";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center" 
        style={{ backgroundImage: `url(${heroGold})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/95 via-[#0a0a0a]/90 to-[#0a0a0a]/80"></div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-4 py-20 sm:py-28 md:py-32 relative z-10 mt-16 sm:mt-0">
        <div className="max-w-4xl mx-auto">
          {/* Live Gold Price Selector */}
          <div className="mb-8 sm:mb-12">
            <LiveGoldPriceSelector />
          </div>
          
          <h1 className="font-display text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
            <span className="text-[#D4AF37]">Invest in Gold,</span>
            <br />
            <span className="text-white">Build Your Wealth</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 leading-relaxed max-w-2xl">
            Secure, transparent, and regal digital gold. Buy, sell, and invest with complete trust.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button 
              size="lg" 
              asChild 
              className="text-sm sm:text-base bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold w-full sm:w-auto"
            >
              <Link to="/auth">
                Buy/Sell Gold <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              asChild 
              className="text-sm sm:text-base bg-transparent border-2 border-white/20 hover:bg-white/10 text-white w-full sm:w-auto"
            >
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent"></div>
    </section>
  );
};