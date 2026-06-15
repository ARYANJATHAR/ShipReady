import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/sections/hero";
import { LogoStrip } from "@/components/sections/logo-strip";
import { Features } from "@/components/sections/features";
import { DiffShowcase } from "@/components/sections/diff-showcase";
import { HowItWorks } from "@/components/sections/how-it-works";
import { FAQ } from "@/components/sections/faq";
import { Pricing } from "@/components/sections/pricing";
import { CTA } from "@/components/sections/cta";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <LogoStrip />
        <section id="features">
          <Features />
        </section>
        <DiffShowcase />
        <section id="how">
          <HowItWorks />
        </section>
        <FAQ />
        <section id="pricing">
          <Pricing />
        </section>
        <CTA />
      </main>
      <Footer />
    </>
  );
}
