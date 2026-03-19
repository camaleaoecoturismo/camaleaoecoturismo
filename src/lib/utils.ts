import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Validação de CPF
export function validarCPF(cpf: string): boolean {
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  if (cpfLimpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false; // CPFs com todos os dígitos iguais
  
// Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = soma % 11;
  let digitoVerificador1 = resto < 2 ? 0 : 11 - resto;
  
  if (digitoVerificador1 !== parseInt(cpfLimpo.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = soma % 11;
  let digitoVerificador2 = resto < 2 ? 0 : 11 - resto;
  
  return digitoVerificador2 === parseInt(cpfLimpo.charAt(10));
}

// Validação de telefone brasileiro
export function validarTelefone(telefone: string): boolean {
  const telefoneDigitos = telefone.replace(/\D/g, '');
  
  // Aceita telefones com 10 dígitos (fixo) ou 11 dígitos (celular)
  if (telefoneDigitos.length < 10 || telefoneDigitos.length > 11) return false;
  
  // Verificar se o DDD é válido (11 a 99)
  const ddd = parseInt(telefoneDigitos.substring(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  
  // Para celular (11 dígitos), o terceiro dígito deve ser 9
  if (telefoneDigitos.length === 11 && telefoneDigitos.charAt(2) !== '9') return false;
  
  return true;
}

// Formatação de CPF
export function formatarCPF(value: string): string {
  const cpf = value.replace(/\D/g, '');
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Formatação de telefone
export function formatarTelefone(value: string): string {
  const telefone = value.replace(/\D/g, '');
  if (telefone.length <= 10) {
    return telefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

// Formatação de valor monetário
export function formatarValor(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Alias for formatarValor (English name)
export const formatCurrency = formatarValor;

// Converte string de data (YYYY-MM-DD) para Date sem deslocamento de timezone
// Usa T12:00:00 para garantir que mesmo com offset de -3h (Brasil) o dia não mude
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  // Se já tem 'T', retorna direto
  if (dateString.includes('T')) return new Date(dateString);
  return new Date(dateString + 'T12:00:00');
}

// Formatação de data local (sem problemas de timezone)
export function formatarDataLocal(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString('pt-BR');
}
