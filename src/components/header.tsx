"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-100">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex-shrink-0 group" 
            aria-label="Начало"
          >
            <div className="w-28 h-16 relative transition-all duration-300 group-hover:animate-gold-shine-continuous">
              <Image
                src="/logo.svg"
                alt="Classy & Beautiful"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation - moved to right side with CTA */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/proceduri"
              className={cn(
                "text-sm font-medium tracking-widest transition-all duration-300 hover:text-gold relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-gold after:transition-all after:duration-300 hover:after:w-full",
                pathname === "/proceduri" ? "text-gold after:w-full" : "text-gray-600"
              )}
            >
              ПРОЦЕДУРИ
            </Link>
            <Link
              href="/#uslugi"
              className={cn(
                "text-sm font-medium tracking-widest transition-all duration-300 hover:text-gold relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-gold after:transition-all after:duration-300 hover:after:w-full",
                pathname === "/" ? "text-gray-600" : "text-gray-600"
              )}
            >
              УСЛУГИ
            </Link>
            <Button asChild>
              <Link href="/rezervacii">ЗАПАЗИ ЧАС</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-brand-black hover:text-gold focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Затвори менюто" : "Отвори менюто"}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-4">
              <Link
                href="/proceduri"
                className="text-sm font-medium tracking-widest text-brand-black hover:text-gold transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                ПРОЦЕДУРИ
              </Link>
              <Link
                href="/#uslugi"
                className="text-sm font-medium tracking-widest text-brand-black hover:text-gold transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                УСЛУГИ
              </Link>
              <Button asChild className="w-full">
                <Link href="/rezervacii" onClick={() => setMobileMenuOpen(false)}>
                  ЗАПАЗИ ЧАС
                </Link>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
