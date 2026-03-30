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
          className="w-full object-cover object-bottom block"
          style={{ marginBottom: "-2px" }}
        />
      </div>

      {/* Dark bar */}
      <div className="bg-[#1a1a1e] py-4 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Logo + CNPJ */}
          <div className="flex flex-col items-start shrink-0">
            <img src={logoImage} alt="Camaleão Ecoturismo" className="h-8 w-auto" />
            <p className="text-white/40 text-[10px] mt-1 whitespace-nowrap">CNPJ: 38.778.474/0001-31</p>
          </div>

          {/* Info */}
          <div className="flex flex-col items-end text-right gap-0.5 text-white/70 text-[11px] sm:text-sm">
            <a href="https://wa.me/5582993649454" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors whitespace-nowrap">
              (82) 99364-9454
            </a>
            <a href="mailto:contato@camaleaoecoturismo.com.br" className="hover:text-white transition-colors whitespace-nowrap hidden sm:block">
              contato@camaleaoecoturismo.com.br
            </a>
            <span className="whitespace-nowrap">Maceió, Alagoas, BR.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
