import Link from "next/link";
import { Instagram, Facebook } from "lucide-react";
import { BUSINESS } from "@/config/site";

export function Footer() {
  return (
    <footer className="bg-ivory border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10">
          <div>
            <p className="font-display text-3xl">Classy &amp; Beautiful</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-600">
              Салон за красота в София и Лом. Процедури за лице, тяло и нокти.
            </p>
          </div>

          <div>
            <h3 className="eyebrow mb-4">Контакти</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>София · Лом</li>
              <li>
                <a href={`tel:${BUSINESS.phone}`} className="hover:text-brand-black hover:underline underline-offset-4">
                  {BUSINESS.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${BUSINESS.email}`} className="hover:text-brand-black hover:underline underline-offset-4">
                  {BUSINESS.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow mb-4">Последвайте ни</h3>
            <div className="flex gap-2">
              <a
                href={BUSINESS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center border border-gray-300 text-brand-black transition-colors hover:border-brand-black"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={BUSINESS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center border border-gray-300 text-brand-black transition-colors hover:border-brand-black"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:justify-between text-xs text-gray-500">
          <p>© {new Date().getFullYear()} CB Classy &amp; Beautiful</p>
          <Link href="/poveritelnost" className="hover:text-brand-black hover:underline underline-offset-4">
            Политика за поверителност
          </Link>
        </div>
      </div>
    </footer>
  );
}
