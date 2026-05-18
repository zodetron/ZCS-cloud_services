"use client";

import { Cloud, GitFork, ExternalLink, Globe, Circle } from "lucide-react";
import Link from "next/link";

const links = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Changelog", href: "#" },
    { label: "Roadmap", href: "#" },
  ],
  Developers: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "SDKs", href: "#" },
    { label: "Status", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Security", href: "#" },
    { label: "Cookies", href: "#" },
  ],
};

const socials = [
  { icon: GitFork, href: "#", label: "GitHub" },
  { icon: ExternalLink, href: "#", label: "Blog" },
  { icon: Globe, href: "#", label: "Website" },
];

export function Footer() {
  return (
    <footer className="bg-black border-t border-white/[0.05] pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-14">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5 group w-fit">
              <div className="relative w-8 h-8 rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-violet-500 to-blue-600" />
                <Cloud className="relative w-4 h-4 text-white m-2" />
              </div>
              <span className="font-bold text-white tracking-tight">StorageCloud</span>
            </Link>
            <p className="text-sm text-white/30 leading-relaxed mb-6 max-w-xs">
              Enterprise object storage for the modern web. S3-compatible, globally distributed, developer-first.
            </p>
            <div className="flex items-center gap-2">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-xl border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white hover:border-white/20 hover:bg-white/[0.04] transition-all duration-200"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-4">{section}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-sm text-white/45 hover:text-white/60 transition-colors duration-200"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/[0.05] gap-4">
          <p className="text-sm text-white/20">
            © 2025 StorageCloud, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <div className="animate-blink w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-white/20">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
