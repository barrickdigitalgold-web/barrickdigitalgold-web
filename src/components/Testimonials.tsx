import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    location: "Mumbai, India",
    rating: 5,
    text: "Barrick Digital Gold has transformed my investment strategy. The platform is secure, transparent, and the returns are excellent!",
  },
  {
    name: "Rahul Patel",
    location: "Ahmedabad, India",
    rating: 5,
    text: "Best digital gold platform I've used. The live pricing and instant transactions make it incredibly convenient.",
  },
  {
    name: "Ayesha Khan",
    location: "Dhaka, Bangladesh",
    rating: 5,
    text: "Professional service and great investment plans. I've been investing for 6 months and very satisfied with the results.",
  },
];

export const Testimonials = () => {
  return (
    <section className="py-12 sm:py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Thousands
            </span>
          </h2>
          <p className="text-sm sm:text-base md:text-xl text-muted-foreground px-4">
            See what our investors have to say about their experience
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-all duration-300 shadow-elegant">
              <CardContent className="p-4 sm:p-6">
                <div className="flex gap-1 mb-3 sm:mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-foreground mb-4 sm:mb-6 italic">"{testimonial.text}"</p>
                <div>
                  <p className="font-semibold text-sm sm:text-base text-foreground">{testimonial.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{testimonial.location}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
