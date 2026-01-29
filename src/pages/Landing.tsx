import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, Calculator, PieChart, Bell } from "lucide-react";
import logo from "@/assets/logo.png";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: "Dela med gruppen",
      description: "Bjud in vänner, familj eller kollegor. Alla ser samma uppdateringar i realtid."
    },
    {
      icon: Calculator,
      title: "Automatiska beräkningar",
      description: "Slipp räkna själv. Vi visar direkt vem som är skyldig vem."
    },
    {
      icon: PieChart,
      title: "Tydlig översikt",
      description: "Se var pengarna går med enkla kategorier och sammanställningar."
    },
    {
      icon: Bell,
      title: "Håll koll",
      description: "Transparent historik och smidiga avräkningar när det passar dig."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/40">
        <div className="container max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <img src={logo} alt="Päronsplit" className="h-12" />
          <Button
            variant="ghost"
            onClick={() => navigate("/auth")}
            className="text-muted-foreground hover:text-foreground"
          >
            Logga in
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="container max-w-3xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-medium text-foreground tracking-tight leading-tight">
            Dela utgifter,<br />
            utan krångel.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            Päronsplit gör det enkelt att hålla koll på gemensamma utgifter. 
            Transparent, snabbt och alltid rättvist.
          </p>
          <div className="pt-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-foreground text-background hover:bg-foreground/90 h-11 px-6"
            >
              Kom igång gratis
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container max-w-5xl mx-auto px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="space-y-3">
                <div className="inline-flex p-2 rounded-md bg-secondary/50">
                  <Icon className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-medium text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="container max-w-3xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-medium text-foreground tracking-tight">
            Redo att börja?
          </h2>
          <p className="text-muted-foreground">
            Skapa ett konto och bjud in din grupp. Helt gratis.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-foreground text-background hover:bg-foreground/90 h-11 px-6"
          >
            Skapa konto
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="container max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <span>© 2025 Päronsplit</span>
            <span>Gjort i Sverige</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
