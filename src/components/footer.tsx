import Image from "next/image";
import Link from "next/link";
import { Instagram, Facebook, MapPin } from "lucide-react";
import { BUSINESS, OFFICES, OFFICE_DETAILS, mapsUrl, openingHoursLines } from "@/config/site";

export function Footer() {
  return (
    <footer className="bg-cocoa text-white/80 border-t-4 border-gold/70">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" aria-label="Начало" className="relative block h-16 w-28">
              {/* The logo is black; invert it for the dark footer */}
              <Image src="/logo.svg" alt="Classy & Beautiful" fill className="object-contain object-left brightness-0 invert" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              Салон за красота в София и Лом. Процедури за лице, тяло и нокти.
            </p>
            <div className="mt-6 flex gap-2">
              <a
                href={BUSINESS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-gold hover:border-gold hover:text-cocoa"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={BUSINESS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-gold hover:border-gold hover:text-cocoa"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {OFFICES.map((office) => {
            const address = OFFICE_DETAILS[office].address;
            const map = mapsUrl(office);
            return (
              <div key={office}>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold">{office}</h3>
                <address className="space-y-2 text-sm not-italic text-white/80">
                  {address && <p>{address}</p>}
                  {openingHoursLines().map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {map && (
                    <a
                      href={map}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-gold hover:text-white hover:underline underline-offset-4"
                    >
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      Как да стигнете
                    </a>
                  )}
                </address>
              </div>
            );
          })}

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold">Контакти</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <a href={`tel:${BUSINESS.phone}`} className="hover:text-white hover:underline underline-offset-4">
                  {BUSINESS.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${BUSINESS.email}`} className="hover:text-white hover:underline underline-offset-4">
                  {BUSINESS.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/15 flex flex-col sm:flex-row gap-2 sm:justify-between text-xs text-white/60">
          <p>© {new Date().getFullYear()} CB Classy &amp; Beautiful</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/poveritelnost" className="hover:text-white hover:underline underline-offset-4">
              Политика за поверителност
            </Link>
            <span className="tracking-[0.2em] uppercase text-gold/80">Made by KSD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
