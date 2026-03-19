import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Country codes with flags
const COUNTRY_CODES = [
  { code: "+55", country: "BR", flag: "🇧🇷", name: "Brasil" },
  { code: "+1", country: "US", flag: "🇺🇸", name: "Estados Unidos" },
  { code: "+351", country: "PT", flag: "🇵🇹", name: "Portugal" },
  { code: "+34", country: "ES", flag: "🇪🇸", name: "Espanha" },
  { code: "+33", country: "FR", flag: "🇫🇷", name: "França" },
  { code: "+49", country: "DE", flag: "🇩🇪", name: "Alemanha" },
  { code: "+39", country: "IT", flag: "🇮🇹", name: "Itália" },
  { code: "+44", country: "GB", flag: "🇬🇧", name: "Reino Unido" },
  { code: "+54", country: "AR", flag: "🇦🇷", name: "Argentina" },
  { code: "+56", country: "CL", flag: "🇨🇱", name: "Chile" },
  { code: "+57", country: "CO", flag: "🇨🇴", name: "Colômbia" },
  { code: "+52", country: "MX", flag: "🇲🇽", name: "México" },
  { code: "+51", country: "PE", flag: "🇵🇪", name: "Peru" },
  { code: "+598", country: "UY", flag: "🇺🇾", name: "Uruguai" },
  { code: "+595", country: "PY", flag: "🇵🇾", name: "Paraguai" },
  { code: "+591", country: "BO", flag: "🇧🇴", name: "Bolívia" },
  { code: "+58", country: "VE", flag: "🇻🇪", name: "Venezuela" },
  { code: "+593", country: "EC", flag: "🇪🇨", name: "Equador" },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onChange,
      countryCode = "+55",
      onCountryCodeChange,
      placeholder = "(00) 00000-0000",
      disabled = false,
      className,
      id,
    },
    ref
  ) => {
    const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

    const formatPhoneNumber = (phone: string) => {
      const digits = phone.replace(/\D/g, "");
      
      // Brazilian phone format
      if (countryCode === "+55") {
        if (digits.length <= 10) {
          return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
        }
        return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
      }
      
      // Default format for other countries
      return digits;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      onChange(rawValue);
    };

    return (
      <div className={cn("flex gap-1", className)}>
        <Select
          value={countryCode}
          onValueChange={(val) => onCountryCodeChange?.(val)}
          disabled={disabled}
        >
          <SelectTrigger className="w-[85px] flex-shrink-0 px-2">
            <span className="flex items-center gap-1">
              <span className="text-base">{selectedCountry.flag}</span>
              <span className="text-xs text-muted-foreground">{selectedCountry.code}</span>
            </span>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {COUNTRY_CODES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                <span className="flex items-center gap-2">
                  <span className="text-base">{country.flag}</span>
                  <span className="text-sm">{country.name}</span>
                  <span className="text-xs text-muted-foreground">{country.code}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          ref={ref}
          id={id}
          type="tel"
          value={formatPhoneNumber(value)}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
          maxLength={20}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput, COUNTRY_CODES };
