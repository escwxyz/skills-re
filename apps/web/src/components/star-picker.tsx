import { StarIcon } from "@phosphor-icons/react";
import { useState } from "react";

export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number>(0);
  const active = hovered || value;

  return (
    <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className={`text-2xl transition-colors ${n <= active ? "text-ink" : "text-rule"}`}
          onMouseEnter={() => setHovered(n)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <StarIcon />
        </button>
      ))}
    </div>
  );
}
