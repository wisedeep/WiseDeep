import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Create Your Profile",
    description: "Sign up and tell us about your spiritual journey and wellness goals.",
  },
  {
    number: "02",
    title: "Choose Your Path",
    description: "Explore courses, chat with AI, or book sessions with certified counsellors.",
  },
  {
    number: "03",
    title: "Track Your Growth",
    description: "Monitor your progress with personal notes and learning milestones.",
  },
  {
    number: "04",
    title: "Find Inner Peace",
    description: "Experience lasting transformation through consistent guidance and support.",
  },
];

const HowItWorks = () => {
  return (
    <section id="counselling" className="py-24 bg-gradient-warm relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-10 right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Your Journey to{" "}
            <span className="bg-gradient-saffron bg-clip-text text-transparent">
              Wellness
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start your path to inner peace in four simple steps
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative animate-slide-up"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Connector Line (hidden on mobile) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent -z-10" />
                )}

                <div className="bg-card rounded-3xl p-8 shadow-medium hover-lift h-full border border-border">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-saffron flex items-center justify-center shadow-soft">
                        <span className="text-2xl font-bold text-primary-foreground">
                          {step.number}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold mb-3 text-foreground">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Arrow for mobile */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center my-4 md:hidden">
                    <ArrowRight className="w-6 h-6 text-primary rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
