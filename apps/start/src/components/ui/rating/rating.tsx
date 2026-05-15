"use client";

import { StarIcon } from "@phosphor-icons/react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { getRatingDisplayValue, getRatingItemState } from "./rating-utils";

type RatingItemState = "filled" | "empty";

interface RatingContextValue {
  displayValue: number;
  disabled: boolean;
  max: number;
  readOnly: boolean;
  setHoveredValue: (value: number | null) => void;
  setValue: (value: number) => void;
}

const RatingContext = React.createContext<RatingContextValue | null>(null);

function useRatingContext(consumerName: string) {
  const context = React.useContext(RatingContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`Rating\``);
  }

  return context;
}

interface RatingProps extends React.ComponentPropsWithoutRef<"div"> {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  max?: number;
  disabled?: boolean;
  readOnly?: boolean;
}

const Rating = React.forwardRef<HTMLDivElement, RatingProps>((props, ref) => {
  const {
    value: valueProp,
    defaultValue = 0,
    onValueChange,
    max = 5,
    disabled = false,
    readOnly = false,
    className,
    children,
    onMouseLeave: onMouseLeaveProp,
    ...rootProps
  } = props;

  const isControlled = valueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const [hoveredValue, setHoveredValue] = React.useState<number | null>(null);

  const value = isControlled ? valueProp : uncontrolledValue;
  const displayValue = getRatingDisplayValue(value, hoveredValue);

  const setValue = React.useCallback(
    (nextValue: number) => {
      if (disabled || readOnly) {
        return;
      }

      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }

      onValueChange?.(nextValue);
    },
    [disabled, isControlled, onValueChange, readOnly],
  );

  const ratingChildren = React.Children.map(children, (child, index) => {
    if (!React.isValidElement(child)) {
      return child;
    }

    const ratingChild = child as React.ReactElement<{ index?: number }>;
    const childIndex =
      typeof ratingChild.props.index === "number" ? ratingChild.props.index : index;

    return React.cloneElement(ratingChild, {
      index: childIndex,
    });
  });

  const contextValue = React.useMemo<RatingContextValue>(
    () => ({
      displayValue,
      disabled,
      max,
      readOnly,
      setHoveredValue,
      setValue,
    }),
    [displayValue, disabled, max, readOnly, setValue],
  );

  const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    onMouseLeaveProp?.(event);
    if (!event.defaultPrevented && !disabled && !readOnly) {
      setHoveredValue(null);
    }
  };

  return (
    <RatingContext.Provider value={contextValue}>
      <div
        ref={ref}
        data-disabled={disabled ? "" : undefined}
        data-readonly={readOnly ? "" : undefined}
        data-slot="rating"
        className={cn("flex items-center gap-1", className)}
        onMouseLeave={handleMouseLeave}
        {...rootProps}
      >
        {ratingChildren}
      </div>
    </RatingContext.Provider>
  );
});
Rating.displayName = "Rating";

interface RatingItemProps extends Omit<React.ComponentPropsWithoutRef<"button">, "children"> {
  index?: number;
  children?: React.ReactNode | ((state: RatingItemState) => React.ReactNode);
}

const RatingItem = React.forwardRef<HTMLButtonElement, RatingItemProps>((props, ref) => {
  const {
    index = 0,
    className,
    children,
    disabled,
    onClick: onClickProp,
    onMouseEnter: onMouseEnterProp,
    onMouseMove: onMouseMoveProp,
    onMouseLeave: onMouseLeaveProp,
    ...itemProps
  } = props;

  const {
    displayValue,
    disabled: isRootDisabled,
    max,
    readOnly,
    setHoveredValue,
    setValue,
  } = useRatingContext("RatingItem");

  const itemValue = index + 1;
  const state = getRatingItemState(displayValue, itemValue);
  const isFilled = state === "filled";
  const isInteractive = !disabled && !isRootDisabled && !readOnly;

  const handlePointerUpdate = () => {
    if (isInteractive) {
      setHoveredValue(itemValue);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClickProp?.(event);
    if (!event.defaultPrevented && isInteractive) {
      setValue(itemValue);
    }
  };

  const handleMouseEnter = (event: React.MouseEvent<HTMLButtonElement>) => {
    onMouseEnterProp?.(event);
    if (!event.defaultPrevented) {
      handlePointerUpdate();
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    onMouseMoveProp?.(event);
    if (!event.defaultPrevented) {
      handlePointerUpdate();
    }
  };

  const handleMouseLeave = (event: React.MouseEvent<HTMLButtonElement>) => {
    onMouseLeaveProp?.(event);
    if (!event.defaultPrevented && isInteractive) {
      setHoveredValue(null);
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      data-slot="rating-item"
      data-state={state}
      aria-pressed={isFilled}
      aria-label={`Rate ${itemValue} of ${max}`}
      disabled={disabled}
      className={cn(
        "inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=filled]:text-primary",
        className,
      )}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...itemProps}
    >
      {typeof children === "function"
        ? children(state)
        : (children ?? <StarIcon weight={isFilled ? "fill" : "regular"} className="size-full" />)}
    </button>
  );
});
RatingItem.displayName = "RatingItem";

export { Rating, RatingItem, useRatingContext as useRating };
