import Link from "next/link";
import { Phone, Mail, MapPin, Instagram, Facebook } from "lucide-react";

export function Footer() {

  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Cb Classy & Beautiful</h3>
            <p className="text-gray-600 text-sm">
              Елегантен салон за красота с професионални процедури за лице, тяло и нокти.
            </p>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Контакти</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-black flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <span>София / Лом</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-black flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <a href="tel:+359888123456" className="hover:text-gold transition-colors">
                  +359 888 123 456
                </a>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-black flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <a href="mailto:info@classybeautiful.bg" className="hover:text-gold transition-colors">
                  info@classybeautiful.bg
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Социални мрежи</h3>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/cb.classy.and.beautiful/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-brand-black flex items-center justify-center hover:bg-gold transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 text-white" aria-hidden="true" />
              </a>
              <a
                href="https://www.facebook.com/cb.classy.and.beautiful?locale=bg_BG"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-brand-black flex items-center justify-center hover:bg-gold transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5 text-white" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            © {new Date().getFullYear()} CB Classy & Beautiful. Всички права запазени.
          </p>
          <Link 
            href="/admin" 
            className="inline-block mt-2 text-xs text-gray-400 hover:text-gold transition-colors"
          >
            Админ портал
          </Link>
        </div>
      </div>
    </footer>
  );
}
