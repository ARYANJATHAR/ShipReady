"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { GithubIcon } from "@/components/social-icons";
import { LiveTicker } from "@/components/live-ticker";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const borderOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      style={{ borderBottomColor: `rgba(35, 34, 32, ${scrolled ? 1 : 0})` }}
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-md border-b"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center gap-8">
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#how">How it works</NavLink>
          <NavLink href="#pricing">Pricing</NavLink>
          <NavLink href="#changelog">Changelog</NavLink>
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <LiveTicker />

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg border border-border text-foreground-muted hover:text-foreground hover:border-border-strong transition-colors"
            aria-label="GitHub"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
          <a
            href="#scan"
            className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:brightness-110 transition-all"
          >
            Scan a repo
          </a>
        </div>
      </div>
    </motion.header>
  );
}

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2 group">
      <div className="relative w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-4 h-4 text-accent-foreground"
        >
          <path
            d="M4 12L9 17L20 6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="absolute inset-0 rounded-lg bg-accent blur-md opacity-0 group-hover:opacity-50 transition-opacity" />
      </div>
      <span className="font-display text-lg tracking-tight text-foreground">
        ShipReady
      </span>
    </a>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="text-sm text-foreground-muted hover:text-foreground transition-colors relative group"
    >
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-px bg-accent group-hover:w-full transition-all duration-300" />
    </a>
  );
}
