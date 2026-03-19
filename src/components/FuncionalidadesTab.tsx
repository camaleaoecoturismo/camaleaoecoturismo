import React from 'react';
import { BannerManagement } from "@/components/BannerManagement";
import { MonthMessageManagement } from "@/components/MonthMessageManagement";
import { ReservationPolicyManagement } from "@/components/ReservationPolicyManagement";
import { MenuManagement } from "@/components/MenuManagement";
import { CouponManagement } from "@/components/CouponManagement";
import { EmailTemplateManagement } from "@/components/EmailTemplateManagement";
import { TicketTemplateManagement } from "@/components/TicketTemplateManagement";
import { TicketManagement } from "@/components/TicketManagement";
import { TransportVehicleManagement } from "@/components/transport/TransportVehicleManagement";
import { SuccessPagePreview } from "@/components/SuccessPagePreview";
import { ProcessMapsModule } from "@/components/processes";
import { RocaSettingsPanel } from "@/components/roca";

interface FuncionalidadesTabProps {
  activeSubTab?: string;
}

export function FuncionalidadesTab({ activeSubTab = 'menu' }: FuncionalidadesTabProps) {
  const renderContent = () => {
    switch (activeSubTab) {
      case 'menu':
        return <MenuManagement />;
      case 'banners':
        return <BannerManagement />;
      case 'mensagens':
        return <MonthMessageManagement />;
      case 'cupons':
        return <CouponManagement />;
      case 'emails':
        return <EmailTemplateManagement />;
      case 'politica':
        return <ReservationPolicyManagement />;
      case 'templates':
        return <TicketTemplateManagement />;
      case 'tickets':
        return <TicketManagement />;
      case 'transporte':
        return <TransportVehicleManagement />;
      case 'pagina-sucesso':
        return <SuccessPagePreview />;
      case 'processos':
        return <ProcessMapsModule />;
      case 'seguro-roca':
        return <RocaSettingsPanel />;
      default:
        return <MenuManagement />;
    }
  };

  return (
    <div className="w-full">
      {renderContent()}
    </div>
  );
}
