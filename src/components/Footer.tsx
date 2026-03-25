import { Instagram, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import logoImage from "@/assets/logo.png";

export default function Footer() {
  return (
    <footer className="bg-[#1a0533] text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <img src={logoImage} alt="Camaleão Ecoturismo" className="h-10 w-auto mb-3 brightness-200" />
            <p className="text-white/70 text-sm leading-relaxed">
              Trilhas, cachoeiras e aventuras inesquecíveis em Alagoas e região.
              Segurança, organização e muito contato com a natureza.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="font-semibold text-sm uppercase tracking-wider mb-3 text-white/50">
              Navegação
            </p>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link to="/" className="hover:text-white transition-colors">Início</Link></li>
              <li><Link to="/agenda" className="hover:text-white transition-colors">Passeios</Link></li>
              <li><Link to="/sobre" className="hover:text-white transition-colors">Sobre nós</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/cliente" className="hover:text-white transition-colors">Portal do cliente</Link></li>
              <li><Link to="/politicas/cancelamento" className="hover:text-white transition-colors">Política de cancelamento</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="font-semibold text-sm uppercase tracking-wider mb-3 text-white/50">
              Contato
            </p>
            <ul className="space-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0 opacity-60" />
                <a href="https://wa.me/5582993649454" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  (82) 99364-9454
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0 opacity-60" />
                <a href="mailto:contato@camaleaoecoturismo.com.br" className="hover:text-white transition-colors">
                  contato@camaleaoecoturismo.com.br
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="w-4 h-4 shrink-0 opacity-60" />
                <a href="https://instagram.com/camaleaoecoturismo" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  @camaleaoecoturismo
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/40">
          <p>© {new Date().getFullYear()} Camaleão Ecoturismo. Todos os direitos reservados.</p>
          <p>CNPJ: 38.778.474/0001-31</p>
        </div>
      </div>
    </footer>
  );
}
