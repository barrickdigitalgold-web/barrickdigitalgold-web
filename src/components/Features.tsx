import { Shield, Zap, TrendingUp, Wallet, Users, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Shield,
    title: "Bank-Grade Security",
    description: "Your investments are protected with advanced encryption and secure wallet management.",
  },
  {
    icon: Zap,
    title: "Instant Transactions",
    description: "Buy and sell digital gold instantly at live market rates with zero delays.",
  },
  {
    icon: TrendingUp,
    title: "Live Market Rates",
    description: "Real-time gold pricing updated every minute for transparent trading.",
  },
  {
    icon: Wallet,
    title: "Secure Wallet",
    description: "Manage your balance, track transactions, and withdraw funds seamlessly.",
  },
  {
    icon: Users,
    title: "Trusted Platform",
    description: "Join thousands of investors across the globe.",
  },
  {
    icon: Award,
    title: "Premium Plans",
    description: "Flexible investment plans with competitive returns and bonuses.",
  },
];

export const Features = () => {
  return (
    <section className="py-12 sm:py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
            Why Choose{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Barrick Digital Gold
            </span>
          </h2>
          <p className="text-sm sm:text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Experience the perfect blend of tradition and technology with our premium digital gold platform.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-gold group"
            >
              <CardContent className="p-4 sm:p-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-gold flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
