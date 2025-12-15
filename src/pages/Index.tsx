import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Testimonials } from "@/components/Testimonials";
import { Footer } from "@/components/Footer";
import { GlobalGoldPrices } from "@/components/GlobalGoldPrices";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <GlobalGoldPrices />
        </div>
      </section>
      <Features />
      <Testimonials />
      <Footer />
    </div>
  );
};

export default Index;
