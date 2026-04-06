"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type MultiSelectOption = {
  value: string;
  label: string;
  description?: string;
};

export function MultiSelectDropdown({
  label,
  required,
  placeholder,
  selectedValues,
  options,
  onChange,
  helperText,
  searchPlaceholder,
}: {
  label: string;
  required?: boolean;
  placeholder: string;
  selectedValues: string[];
  options: MultiSelectOption[];
  onChange: (values: string[]) => void;
  helperText?: string;
  searchPlaceholder?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(option.value)),
    [options, selectedSet],
  );

  const visibleOptions = useMemo(() => {
    if (!query.trim()) {
      return options;
    }

    const normalizedQuery = query.trim().toLowerCase();
    return options.filter((option) => {
      return (
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.description?.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [options, query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleOption = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(selectedValues.filter((item) => item !== value));
      return;
    }

    onChange([...selectedValues, value]);
  };

  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
        {required ? " *" : ""}
      </span>

      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left text-sm"
        >
          <span className={selectedOptions.length > 0 ? "text-[var(--color-text)]" : "text-muted"}>
            {selectedOptions.length > 0
              ? `${selectedOptions.length} selected`
              : placeholder}
          </span>
          <ChevronDown size={16} className={open ? "rotate-180 transition" : "transition"} />
        </button>

        {open ? (
          <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder ?? "Search..."}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] py-2 pl-8 pr-3 text-sm"
              />
            </div>

            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
              {visibleOptions.length < 1 ? (
                <p className="rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-xs text-muted">
                  No matches found.
                </p>
              ) : (
                visibleOptions.map((option) => {
                  const checked = selectedSet.has(option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleOption(option.value)}
                      className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-[var(--color-surface-muted)]"
                    >
                      <span
                        className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border ${
                          checked
                            ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                            : "border-[var(--color-border)] text-transparent"
                        }`}
                      >
                        <Check size={11} />
                      </span>
                      <span>
                        <span className="block font-medium">{option.label}</span>
                        {option.description ? (
                          <span className="block text-xs text-muted">{option.description}</span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleOption(option.value)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1 text-xs"
            >
              {option.label}
              <X size={12} />
            </button>
          ))}
        </div>
      ) : null}

      {helperText ? <p className="text-xs text-muted">{helperText}</p> : null}
    </label>
  );
}
