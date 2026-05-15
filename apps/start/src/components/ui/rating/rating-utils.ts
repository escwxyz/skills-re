export function getRatingDisplayValue(value: number, hoveredValue: number | null) {
  return hoveredValue ?? value;
}

export function getRatingItemState(displayValue: number, itemValue: number) {
  return displayValue >= itemValue ? "filled" : "empty";
}
