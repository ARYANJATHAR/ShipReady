"use client";

import { GithubIcon, TwitterIcon } from "@/components/social-icons";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog", href: "#" },
      { label: "Roadmap", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "API reference", href: "#" },
      { label: "Templates", href: "#" },
      { label: "Status", href: "#" },
      { label: "Brand kit", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
      { label: "DPA", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-background-elevated/30">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
          {/* Brand col */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
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
              </div>
              <span className="font-display text-lg tracking-tight text-foreground">
                ShipReady
              </span>
            </div>
            <p className="text-foreground-muted text-sm max-w-xs leading-relaxed">
              The missing checklist for vibe coded websites. From idea to
              production, in one scan.
            </p>
            <div className="flex items-center gap-2 mt-6">
              <SocialLink
                href="https://github.com"
                label="GitHub"
                icon={<GithubIcon className="w-4 h-4" />}
              />
              <SocialLink
                href="https://twitter.com"
                label="Twitter"
                icon={<TwitterIcon className="w-4 h-4" />}
              />
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-xs uppercase tracking-wider text-foreground-dim mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="font-mono text-xs text-foreground-dim">
            © 2026 ShipReady Labs. Crafted in Bengaluru.
          </p>
          <div className="flex items-center gap-2 font-mono text-xs text-foreground-dim">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
            </span>
            <span>all systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex items-center justify-center w-9 h-9 rounded-lg border border-border text-foreground-muted hover:text-foreground hover:border-border-strong transition-colors"
    >
      {icon}
    </a>
  );
}
