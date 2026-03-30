import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";
import logoImage from "@/assets/logo-branco.png";

const WHATSAPP_NUMBER = "5582993649454";
const WHATSAPP_MSG = encodeURIComponent("Olá! Tenho interesse em conhecer os passeios da Camaleão Ecoturismo.");

export default function Footer() {
  return (
    <footer className="bg-[#820AD1]">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-12">

        {/* Top: logo + whatsapp CTA */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 pb-8 border-b border-white/20">
          {/* Logo + tagline */}
          <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
            <img src={logoImage} alt="Camaleão Ecoturismo" className="h-9 w-auto" />
            <p className="text-white/60 text-xs max-w-[220px] leading-relaxed">
              Trilhas, cachoeiras e aventuras inesquecíveis no Nordeste.
            </p>
          </div>

          {/* WhatsApp CTA */}
          <div className="flex flex-col items-center md:items-end gap-3 text-center md:text-right">
            <p className="text-white/80 text-sm font-medium">Ficou com alguma dúvida?</p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-white text-[#820AD1] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors shadow-lg"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Falar no WhatsApp
            </a>
          </div>
        </div>

        {/* Bottom: links + social + copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
          {/* Nav links */}
          <nav className="flex flex-wrap justify-center sm:justify-start gap-x-5 gap-y-1">
            {[
              { label: "Início", to: "/" },
              { label: "Agenda", to: "/agenda" },
              { label: "Blog", to: "/blog" },
              { label: "FAQ", to: "/faq" },
              { label: "Políticas", to: "/politicas" },
              { label: "Área do Cliente", to: "/cliente" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-white/55 hover:text-white text-xs transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Social + info */}
          <div className="flex items-center gap-4 shrink-0">
            <a
              href="https://instagram.com/camaleaoecoturismo"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full border border-white/25 flex items-center justify-center text-white/60 hover:text-white hover:border-white/60 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-3.5 h-3.5" />
            </a>
            <span className="text-white/30 text-[11px] hidden sm:block">
              CNPJ 38.778.474/0001-31
            </span>
          </div>
        </div>

        <p className="text-center sm:text-left text-white/25 text-[10px] mt-4">
          © {new Date().getFullYear()} Camaleão Ecoturismo · Maceió, Alagoas
        </p>
      </div>
    </footer>
  );
}
