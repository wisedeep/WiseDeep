import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import CoursesSection from "@/components/CoursesSection";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index: () => JSX.Element = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <Features />
      <HowItWorks />
      <CoursesSection />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
