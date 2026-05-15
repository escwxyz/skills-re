export type Direction = "ltr" | "rtl";
export type Orientation = "horizontal" | "vertical";
export type ActivationMode = "automatic" | "manual";
export type Size = "default" | "sm" | "lg";
export type Step = 0.5 | 1;
export type DataState = "full" | "partial" | "empty";
export type FocusIntent = "first" | "last" | "prev" | "next";

interface GradientStop {
  offset: string;
  stopColor: string;
}

const MAP_KEY_TO_FOCUS_INTENT: Record<string, FocusIntent> = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  Home: "first",
  End: "last",
};

export function getRatingItemId(id: string, value: number) {
  return `${id}-item-${value}`;
}

export function getRatingPartialFillGradientId(id: string, step: Step) {
  return `partial-fill-gradient-${id}-${step}`;
}

export function getRatingFocusIntent(key: string, dir?: Direction, orientation?: Orientation) {
  let normalizedKey = key;
  if (dir === "rtl") {
    if (key === "ArrowLeft") {
      normalizedKey = "ArrowRight";
    } else if (key === "ArrowRight") {
      normalizedKey = "ArrowLeft";
    }
  }

  if (orientation === "horizontal" && ["ArrowUp", "ArrowDown"].includes(normalizedKey)) {
    return;
  }

  if (orientation === "vertical" && ["ArrowLeft", "ArrowRight"].includes(normalizedKey)) {
    return;
  }

  return MAP_KEY_TO_FOCUS_INTENT[normalizedKey];
}

export function getRatingHalfStepValue(
  itemValue: number,
  step: Step,
  dir: Direction,
  isLeftHalf: boolean,
) {
  if (dir === "rtl") {
    return isLeftHalf ? itemValue : itemValue - step;
  }

  return isLeftHalf ? itemValue - step : itemValue;
}

export function getRatingSelectedItemValue(value: number, step: Step) {
  return step < 1 ? Math.ceil(value) : value;
}

export function getRatingDataState(displayValue: number, itemValue: number, step: Step): DataState {
  if (displayValue >= itemValue) {
    return "full";
  }

  if (step < 1 && displayValue >= itemValue - step && displayValue < itemValue) {
    return "partial";
  }

  return "empty";
}

export function getRatingItemSizeClassName(size: Size) {
  if (size === "sm") {
    return "size-4";
  }

  if (size === "lg") {
    return "size-6";
  }

  return "size-5";
}

export function getRatingPartialFillGradientStops(dir: Direction): GradientStop[] {
  if (dir === "rtl") {
    return [
      { offset: "50%", stopColor: "transparent" },
      { offset: "50%", stopColor: "currentColor" },
    ];
  }

  return [
    { offset: "50%", stopColor: "currentColor" },
    { offset: "50%", stopColor: "transparent" },
  ];
}
