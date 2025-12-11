import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-lg border-b border-border z-50 transition-smooth">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-gradient-saffron flex items-center justify-center shadow-soft">
              <span className="text-xl font-bold text-primary-foreground">W</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-saffron bg-clip-text text-transparent">
              WiseDeep
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-foreground hover:text-primary transition-smooth">
              Features
            </a>
            <a href="#courses" className="text-foreground hover:text-primary transition-smooth">
              Courses
            </a>
            <a href="#counselling" className="text-foreground hover:text-primary transition-smooth">
              Counselling
            </a>
            <a href="#about" className="text-foreground hover:text-primary transition-smooth">
              About
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/login")}>Sign In</Button>
            <Button variant="default" className="bg-gradient-saffron hover:shadow-glow transition-smooth" onClick={() => navigate("/signup")}>
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="h-6 w-6 text-foreground" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 animate-fade-in">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-foreground hover:text-primary transition-smooth">
                Features
              </a>
              <a href="#courses" className="text-foreground hover:text-primary transition-smooth">
                Courses
              </a>
              <a href="#counselling" className="text-foreground hover:text-primary transition-smooth">
                Counselling
              </a>
              <a href="#about" className="text-foreground hover:text-primary transition-smooth">
                About
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                <Button variant="ghost" className="w-full" onClick={() => navigate("/login")}>Sign In</Button>
                <Button variant="default" className="w-full bg-gradient-saffron" onClick={() => navigate("/signup")}>
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
