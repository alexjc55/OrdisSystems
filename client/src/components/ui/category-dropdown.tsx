import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";

export interface CategoryOption {
  id: string;
  label: string;
}

interface CategoryDropdownProps {
  value: string;
  onChange: (v: string) => void;
  options: CategoryOption[];
  currentLanguage: string;
  triggerClassName?: string;
  "data-testid"?: string;
}

export function CategoryDropdown({
  value,
  onChange,
  options,
  currentLanguage,
  triggerClassName,
  "data-testid": dataTestId,
}: CategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isRTL = currentLanguage === "he" || currentLanguage === "ar";

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selected = options.find((o) => o.id === value);
  const displayLabel = selected ? selected.label : (options[0]?.label ?? "");

  return (
    <div ref={containerRef} className="relative w-full" dir={isRTL ? "rtl" : "ltr"}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        data-testid={dataTestId}
        style={{ textAlign: "start" }}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          triggerClassName
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ms-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 min-w-[190px] rounded-md border bg-popover text-popover-foreground shadow-md">
          <div
            className="overflow-y-auto overscroll-contain"
            style={{
              maxHeight: "15rem",
              touchAction: "pan-y",
              WebkitOverflowScrolling: "touch",
            } as React.CSSProperties}
          >
            <div className="p-1">
              {options.map((opt) => (
                <div
                  key={opt.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onChange(opt.id);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "relative whitespace-nowrap rounded-sm py-1.5 ps-8 pe-3 text-sm cursor-pointer select-none",
                    isRTL ? "text-right" : "text-left",
                    value === opt.id
                      ? "bg-primary text-white"
                      : "hover:bg-primary hover:text-white"
                  )}
                >
                  {value === opt.id && (
                    <span className="absolute start-2 top-1/2 -translate-y-1/2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Helper: build options array from raw category objects */
export function buildCategoryOptions(
  categories: any[],
  currentLanguage: string,
  storeSettingsData: any,
  allLabel: string
): CategoryOption[] {
  return [
    { id: "all", label: allLabel },
    ...categories.map((cat) => ({
      id: cat.id.toString(),
      label:
        getLocalizedField(cat, "name", currentLanguage as SupportedLanguage, storeSettingsData) ||
        cat.name ||
        `Category ${cat.id}`,
    })),
  ];
}
