export const normalizeDestinationName = (raw: string | null | undefined): string => {
  if (!raw) return "";

  return raw
    .replace(/\s*[-–]\s*(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)(\s+\d{4})?/gi, "")
    .replace(/\s*[-–]\s*\d{4}/g, "")
    .replace(/\s*\([^)]+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
};
