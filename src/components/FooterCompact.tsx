import logoImage from "@/assets/logo-branco.png";
import footerBanner from "@/assets/footer-banner.png";

export default function FooterCompact() {
  return (
    <footer>
      {/* Mountains silhouette */}
      <div className="w-full overflow-hidden leading-none">
        <img
          src={footerBanner}
          alt=""
          className="w-full object-cover object-bottom"
          style={{ display: "block", marginBottom: "-2px" }}
        />
      </div>

      {/* Dark bar */}
      <div className="bg-[#1a1a1e] py-5 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-white/70 text-sm">
          {/* Logo */}
          <img src={logoImage} alt="Camaleão Ecoturismo" className="h-10 w-auto shrink-0" />

          {/* Info */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-center sm:text-left text-xs sm:text-sm">
            <a href="https://wa.me/5582993649454" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors whitespace-nowrap">
              (82) 99364-9454
            </a>
            <a href="mailto:contato@camaleaoecoturismo.com.br" className="hover:text-white transition-colors whitespace-nowrap">
              contato@camaleaoecoturismo.com.br
            </a>
            <span className="whitespace-nowrap">Maceió, Alagoas, BR.</span>
          </div>

          {/* CNPJ */}
          <p className="text-xs whitespace-nowrap shrink-0">CNPJ: 38.778.474/0001-31</p>
        </div>
      </div>
    </footer>
  );
}
