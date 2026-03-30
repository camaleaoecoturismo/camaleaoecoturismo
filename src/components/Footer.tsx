import { Link } from "react-router-dom";
import { Instagram, MapPin, Phone, Mail, ArrowRight } from "lucide-react";
import logoImage from "@/assets/logo-lado.png";

const WHATSAPP_NUMBER = "5582993649454";
const WHATSAPP_MSG = encodeURIComponent("Olá! Tenho interesse em conhecer os passeios da Camaleão Ecoturismo.");

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function Footer() {
  return (
    <footer>
      {/* ── CTA strip ── */}
      <div className="bg-[#820AD1] px-4 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-1">Pronto para aventurar?</p>
            <h2 className="text-white font-bold text-2xl md:text-3xl leading-tight">
              Sua próxima expedição começa<br className="hidden md:block" /> com uma mensagem.
            </h2>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-white text-[#820AD1] font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-white/90 transition-colors shadow-lg shrink-0"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Falar no WhatsApp
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* ── Main footer ── */}
      <div className="bg-[#0f0e17] text-white/70 px-4 pt-14 pb-8">
        <div className="max-w-6xl mx-auto">

          {/* Columns grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">

            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <img src={logoImage} alt="Camaleão Ecoturismo" className="h-9 w-auto mb-4 opacity-90" />
              <p className="text-white/50 text-sm leading-relaxed mb-5">
                Expedições de ecoturismo para os melhores roteiros do Nordeste. Trilhas, cachoeiras e experiências que transformam.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://instagram.com/camaleaoecoturismo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:border-white/50 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:border-white/50 transition-colors"
                  aria-label="WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Explorar */}
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-5">Explorar</h4>
              <ul className="space-y-3">
                {[
                  { label: "Agenda completa", to: "/agenda" },
                  { label: "Chapada Diamantina", to: "/chapada-diamantina" },
                  { label: "Guia de destinos", to: "/guia" },
                  { label: "Blog", to: "/blog" },
                  { label: "Camaleão na Mídia", to: "/midia" },
                ].map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-5">Empresa</h4>
              <ul className="space-y-3">
                {[
                  { label: "Sobre nós", to: "/sobre" },
                  { label: "Nossa equipe", to: "/equipe" },
                  { label: "Central de Ajuda", to: "/faq" },
                  { label: "Políticas", to: "/politicas" },
                  { label: "Área do cliente", to: "/cliente" },
                ].map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contato */}
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-5">Contato</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-sm">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#820AD1]" />
                  <span>Maceió, Alagoas</span>
                </li>
                <li>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm hover:text-white transition-colors"
                  >
                    <Phone className="w-4 h-4 shrink-0 text-[#820AD1]" />
                    (82) 9 9364-9454
                  </a>
                </li>
                <li>
                  <a
                    href="https://instagram.com/camaleaoecoturismo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm hover:text-white transition-colors"
                  >
                    <Instagram className="w-4 h-4 shrink-0 text-[#820AD1]" />
                    @camaleaoecoturismo
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8">
            <p className="text-white/30 text-xs">
              © {new Date().getFullYear()} Camaleão Ecoturismo · CNPJ 38.778.474/0001-31
            </p>
            <div className="flex gap-5">
              <Link to="/politicas?tipo=termos" className="text-white/30 hover:text-white/60 text-xs transition-colors">Termos de uso</Link>
              <Link to="/politicas?tipo=cancelamento" className="text-white/30 hover:text-white/60 text-xs transition-colors">Cancelamento</Link>
              <Link to="/politicas?tipo=privacidade" className="text-white/30 hover:text-white/60 text-xs transition-colors">Privacidade</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
