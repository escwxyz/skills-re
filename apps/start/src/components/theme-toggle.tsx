import { MonitorIcon, MoonStarsIcon, SunDimIcon } from "@phosphor-icons/react";

import { useTheme } from "@/lib/theme";

const themeCycle = {
  dark: {
    icon: MoonStarsIcon,
    label: "dark",
    next: "system",
  },
  light: {
    icon: SunDimIcon,
    label: "light",
    next: "dark",
  },
  system: {
    icon: MonitorIcon,
    label: "system",
    next: "light",
  },
} as const;

export const ThemeToggle = ({ className }: { className?: string }) => {
  const { selected, setSelected } = useTheme();
  const value = selected ?? "system";
  const { icon: Icon, label, next } = themeCycle[value];

  const toggle = () => {
    setSelected(next);
  };

  return (
    <button
      type="button"
      aria-label={`Theme is ${label}. Click to switch to ${next}.`}
      title={`Theme: ${label}`}
      onClick={toggle}
      className={className}
    >
      <Icon size={16} />
    </button>
  );
};
