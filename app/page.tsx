"use client";

import { Button } from "@/components/ui/button";
import { Shield, Terminal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import "@/app/styles/cyber-global.css";

const MainPage = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const handleStartHacking = () => {
    if (session?.user) {
      // If logged in, go to levels page
      router.push("/levels/1.1");
    } else {
      // If not logged in, go to sign up
      router.push("/auth/signup");
    }
  };

  return (
    <>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-gradient-hero">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--grid-color))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--grid-color))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        </div>

        {/* Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] animate-float" style={{ background: 'radial-gradient(circle, hsl(180 100% 50% / 0.4) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] animate-float" style={{ background: 'radial-gradient(circle, hsl(150 100% 45% / 0.4) 0%, transparent 70%)', animationDelay: "1s" }} />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-primary/20">
              <Shield className="w-4 h-4 text-primary animate-glow-pulse" />
              <span className="text-sm text-muted-foreground">Compete • Learn • Conquer</span>
            </div>

            <h1 className="h-[120px] text-5xl md:text-7xl lg:text-8xl font-bold mb-6 animate-slide-in-left" style={{ background: 'linear-gradient(to right, hsl(180 100% 50%), hsl(150 100% 45%), hsl(280 100% 60%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Capture The Flag
            </h1>

            <p className="text-xl md:text-2xl text-foreground/80 mb-8 max-w-3xl mx-auto animate-slide-in-right">
              Test your cybersecurity skills in real-world scenarios. Solve challenges, climb the leaderboard, and become a security champion.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Button
                size="lg"
                onClick={handleStartHacking}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,255,255,0.5)] hover:shadow-[0_0_30px_rgba(0,255,255,0.7)] transition-all duration-300 group"
              >
                <Terminal className="w-5 h-5 mr-2 group-hover:animate-glitch" />
                {session?.user ? 'Continue Hacking' : 'Start Hacking'}
              </Button>

              {session?.user ? (
                session.user.isAdmin && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => router.push("/admin")}
                    className="border-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Admin Dashboard
                  </Button>
                )
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push("/auth/signin")}
                  className="border-2 border-primary/50"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          {/* <div className="grid grid-cols-3 gap-8 mt-20 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary text-glow-cyan mb-2">500+</div>
              <div className="text-sm text-muted-foreground">Active Players</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-secondary text-glow-green mb-2">100+</div>
              <div className="text-sm text-muted-foreground">Challenges</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-accent mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Live Competitions</div>
            </div>
          </div> */}
        </div>
      </section>
    </>)
}

export default MainPage