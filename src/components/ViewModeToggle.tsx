import React from "react";
import { LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ViewMode = "grid" | "list";

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  variant?: "dark" | "light";
}

export function ViewModeToggle({ value, onChange, variant = "dark" }: ViewModeToggleProps) {
  const isDark = variant === "dark";
  
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(val) => {
        if (val) onChange(val as ViewMode);
      }}
      className={`rounded-lg p-1 ${isDark ? "bg-white/10 backdrop-blur-sm" : "bg-gray-100"}`}
    >
      <ToggleGroupItem
        value="grid"
        aria-label="Visualização em cards"
        className={`transition-all px-2.5 py-1.5 rounded-md ${
          isDark 
            ? "data-[state=on]:bg-white data-[state=on]:text-primary text-white/80 hover:text-white hover:bg-white/10"
            : "data-[state=on]:bg-primary data-[state=on]:text-white text-gray-600 hover:text-gray-800 hover:bg-gray-200"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="list"
        aria-label="Visualização em lista"
        className={`transition-all px-2.5 py-1.5 rounded-md ${
          isDark 
            ? "data-[state=on]:bg-white data-[state=on]:text-primary text-white/80 hover:text-white hover:bg-white/10"
            : "data-[state=on]:bg-primary data-[state=on]:text-white text-gray-600 hover:text-gray-800 hover:bg-gray-200"
        }`}
      >
        <List className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
