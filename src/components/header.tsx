"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/proceduri", label: "Процедури" },
  { href: "/galeriya", label: "Галерия" },
  { href: "/#uslugi", label: "Услуги" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const close = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-taupe-200">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8" aria-label="Основна навигация">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0" aria-label="Начало" onClick={close}>
            <div className="w-28 h-16 relative">
              <Image src="/logo.svg" alt="Classy & Beautiful" fill className="object-contain" priority />
            </div>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative py-1 text-xs font-semibold uppercase tracking-[0.2em] transition-colors hover:text-cocoa",
                    "after:absolute after:-bottom-0.5 after:left-0 after:h-px after:bg-gold after:transition-all after:duration-300 hover:after:w-full",
                    active ? "text-cocoa after:w-full" : "text-taupe-600 after:w-0"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <Button asChild size="sm">
              <Link href="/rezervacii">Запази час</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 text-brand-black focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Затвори менюто" : "Отвори менюто"}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-taupe-200">
            <div className="flex flex-col gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-black"
                  onClick={close}
                >
                  {link.label}
                </Link>
              ))}
              <Button asChild className="w-full">
                <Link href="/rezervacii" onClick={close}>
                  Запази час
                </Link>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
