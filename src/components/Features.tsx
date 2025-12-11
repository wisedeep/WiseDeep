import { BookOpen, Calendar, MessageSquare, NotebookPen, Shield, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: MessageSquare,
    title: "AI Spiritual Counsellor",
    description: "Get instant guidance from our AI trained on Bhagavad Gita, Quran, Bible, and modern psychology.",
    gradient: "from-primary to-primary-glow",
  },
  {
    icon: Calendar,
    title: "Book Therapy Sessions",
    description: "Connect with certified spiritual counsellors for one-on-one guidance and support.",
    gradient: "from-accent to-primary",
  },
  {
    icon: BookOpen,
    title: "Structured Courses",
    description: "Access curated learning paths for emotional well-being and spiritual growth.",
    gradient: "from-primary-glow to-accent",
  },
  {
    icon: NotebookPen,
    title: "Personal Notes",
    description: "Track your journey with private notes, reflections, and insights.",
    gradient: "from-accent to-primary",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your conversations and progress are completely confidential and encrypted.",
    gradient: "from-primary to-accent",
  },
  {
    icon: Users,
    title: "Expert Counsellors",
    description: "All counsellors are verified and approved by our admin team.",
    gradient: "from-primary-glow to-primary",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need for{" "}
            <span className="bg-gradient-saffron bg-clip-text text-transparent">
              Mental Wellness
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools combining ancient spiritual wisdom with modern therapeutic approaches
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-border hover-lift group overflow-hidden animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:animate-glow`}>
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-smooth">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
