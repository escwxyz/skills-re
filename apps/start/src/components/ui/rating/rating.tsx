"use client";

import { StarIcon } from "@phosphor-icons/react";
import * as React from "react";
import { VisuallyHiddenInput } from "@/components/ui/visually-hidden-input";
import { useAsRef } from "@/hooks/use-as-ref";
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-layout-effect";
import { useLazyRef } from "@/hooks/use-lazy-ref";
import { useComposedRefs } from "@/lib/compose-refs";
import { cn } from "@/lib/utils";
import {
  getRatingDataState,
  getRatingFocusIntent,
  getRatingHalfStepValue,
  getRatingItemId,
  getRatingItemSizeClassName,
  getRatingPartialFillGradientId,
  getRatingPartialFillGradientStops,
  getRatingSelectedItemValue,
} from "./rating-utils";
import type { ActivationMode, DataState, Direction, Orientation, Size, Step } from "./rating-utils";

type RootElement = React.ComponentRef<typeof Rating>;
type ItemElement = React.ComponentRef<typeof RatingItem>;

const ROOT_NAME = "Rating";
const ITEM_NAME = "RatingItem";

const ENTRY_FOCUS = "ratingFocusGroup.onEntryFocus";
const EVENT_OPTIONS = { bubbles: false, cancelable: true };

function focusFirst(candidates: React.RefObject<ItemElement | null>[], preventScroll = false) {
  const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
  for (const candidateRef of candidates) {
    const candidate = candidateRef.current;
    if (!candidate) {
      continue;
    }
    if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) {
      return;
    }
    candidate.focus({ preventScroll });
    if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) {
      return;
    }
  }
}

function isModifierKeyPressed(event: React.KeyboardEvent<ItemElement>) {
  return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;
}

interface RatingPartialFillGradientProps {
  dir: Direction;
  gradientId: string;
}

function RatingPartialFillGradient({ dir, gradientId }: RatingPartialFillGradientProps) {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <linearGradient id={gradientId}>
          {getRatingPartialFillGradientStops(dir).map((stop) => (
            <stop key={`${stop.offset}-${stop.stopColor}`} {...stop} />
          ))}
        </linearGradient>
      </defs>
    </svg>
  );
}

interface StoreState {
  value: number;
  hoveredValue: number | null;
}

interface Store {
  subscribe: (callback: () => void) => () => void;
  getState: () => StoreState;
  setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
  notify: () => void;
}

const StoreContext = React.createContext<Store | null>(null);

function useStoreContext(consumerName: string) {
  const context = React.useContext(StoreContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
  }
  return context;
}

function useStore<T>(selector: (state: StoreState) => T, ogStore?: Store | null): T {
  const contextStore = React.useContext(StoreContext);

  const store = ogStore ?? contextStore;

  if (!store) {
    throw new Error(`\`useStore\` must be used within \`${ROOT_NAME}\``);
  }

  const getSnapshot = React.useCallback(() => selector(store.getState()), [store, selector]);

  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

interface ItemData {
  id: string;
  ref: React.RefObject<ItemElement | null>;
  value: number;
  disabled: boolean;
}

interface RatingContextValue {
  rootId: string;
  dir: Direction;
  orientation: Orientation;
  activationMode: ActivationMode;
  size: Size;
  max: number;
  step: Step;
  clearable: boolean;
  disabled: boolean;
  readOnly: boolean;
  getAutoIndex: (instanceId: string) => number;
}

const RatingContext = React.createContext<RatingContextValue | null>(null);

function useRatingContext(consumerName: string) {
  const context = React.useContext(RatingContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
  }
  return context;
}

interface FocusContextValue {
  tabStopId: string | null;
  onItemFocus: (tabStopId: string) => void;
  onItemShiftTab: () => void;
  onFocusableItemAdd: () => void;
  onFocusableItemRemove: () => void;
  onItemRegister: (item: ItemData) => void;
  onItemUnregister: (id: string) => void;
  getItems: () => ItemData[];
}

const FocusContext = React.createContext<FocusContextValue | null>(null);

function useFocusContext(consumerName: string) {
  const context = React.useContext(FocusContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`FocusProvider\``);
  }
  return context;
}

interface RatingProps extends React.ComponentProps<"div"> {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onHover?: (value: number | null) => void;
  max?: number;
  activationMode?: ActivationMode;
  dir?: Direction;
  orientation?: Orientation;
  size?: Size;
  step?: Step;
  clearable?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
}

function Rating(props: RatingProps) {
  const {
    value: valueProp,
    defaultValue = 0,
    onValueChange,
    onHover,
    onFocus: onFocusProp,
    onMouseDown: onMouseDownProp,
    dir: dirProp,
    orientation = "horizontal",
    activationMode = "automatic",
    size = "default",
    max = 5,
    step = 1,
    clearable = false,
    disabled = false,
    readOnly = false,
    required = false,
    className,
    id,
    name,
    ref,
    ...rootProps
  } = props;

  const dir = dirProp ?? "ltr";
  const instanceId = React.useId();
  const rootId = id ?? instanceId;

  const listenersRef = useLazyRef(() => new Set<() => void>());
  const stateRef = useLazyRef<StoreState>(() => ({
    value: valueProp ?? defaultValue,
    hoveredValue: null,
  }));

  const propsRef = useAsRef({
    onValueChange,
    onHover,
    onFocus: onFocusProp,
    onMouseDown: onMouseDownProp,
    step,
  });

  /* eslint-disable promise/prefer-await-to-callbacks */
  const store = React.useMemo<Store>(
    () => ({
      subscribe: (cb) => {
        listenersRef.current.add(cb);
        return () => listenersRef.current.delete(cb);
      },
      getState: () => stateRef.current,
      setState: (key, value) => {
        if (Object.is(stateRef.current[key], value)) {
          return;
        }

        if (key === "value" && typeof value === "number") {
          stateRef.current.value = value;
          propsRef.current.onValueChange?.(value);
        } else if (key === "hoveredValue") {
          stateRef.current.hoveredValue = value as number | null;
          propsRef.current.onHover?.(value as number | null);
        } else {
          stateRef.current[key] = value;
        }

        store.notify();
      },
      notify: () => {
        for (const cb of listenersRef.current) {
          cb();
        }
      },
    }),
    [listenersRef, stateRef, propsRef],
  );
  /* eslint-enable promise/prefer-await-to-callbacks */

  useIsomorphicLayoutEffect(() => {
    if (valueProp !== undefined) {
      store.setState("value", valueProp);
    }
  }, [valueProp]);

  const value = useStore((state) => state.value, store);

  const [formTrigger, setFormTrigger] = React.useState<RootElement | null>(null);
  const composedRef = useComposedRefs(ref, (node) => setFormTrigger(node));
  const isFormControl = formTrigger ? !!formTrigger.closest("form") : true;

  const [tabStopId, setTabStopId] = React.useState<string | null>(null);
  const [isTabbingBackOut, setIsTabbingBackOut] = React.useState(false);
  const [focusableItemCount, setFocusableItemCount] = React.useState(0);
  const isClickFocusRef = React.useRef(false);
  const itemsRef = React.useRef<Map<string, ItemData>>(new Map());

  const autoIndexMapRef = React.useRef(new Map<string, number>());
  const nextAutoIndexRef = React.useRef(0);

  const getAutoIndex = React.useCallback(
    (instance: string) => {
      const existingIndex = autoIndexMapRef.current.get(instance);
      if (existingIndex !== undefined) {
        return existingIndex;
      }

      nextAutoIndexRef.current += 1;
      const newIndex = nextAutoIndexRef.current;
      autoIndexMapRef.current.set(instanceId, newIndex);
      return newIndex;
    },
    [instanceId],
  );

  const onItemFocus = React.useCallback((tsId: string) => {
    setTabStopId(tsId);
  }, []);

  const onItemShiftTab = React.useCallback(() => {
    setIsTabbingBackOut(true);
  }, []);

  const onFocusableItemAdd = React.useCallback(() => {
    setFocusableItemCount((prevCount) => prevCount + 1);
  }, []);

  const onFocusableItemRemove = React.useCallback(() => {
    setFocusableItemCount((prevCount) => prevCount - 1);
  }, []);

  const onItemRegister = React.useCallback((item: ItemData) => {
    itemsRef.current.set(item.id, item);
  }, []);

  const onItemUnregister = React.useCallback((item: string) => {
    itemsRef.current.delete(item);
  }, []);

  const getItems = React.useCallback(
    () =>
      [...itemsRef.current.values()]
        .filter((item) => item.ref.current)
        .sort((a, b) => {
          const elementA = a.ref.current;
          const elementB = b.ref.current;
          if (!elementA || !elementB) {
            return 0;
          }
          const position = elementA.compareDocumentPosition(elementB);
          if (position && Node.DOCUMENT_POSITION_FOLLOWING) {
            return -1;
          }
          if (position && Node.DOCUMENT_POSITION_PRECEDING) {
            return 1;
          }
          return 0;
        }),
    [],
  );

  const onBlur = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      rootProps.onBlur?.(event);
      if (event.defaultPrevented) {
        return;
      }

      setIsTabbingBackOut(false);
    },
    [rootProps],
  );

  const onFocus = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      propsRef.current.onFocus?.(event);
      if (event.defaultPrevented) {
        return;
      }

      const isKeyboardFocus = !isClickFocusRef.current;
      if (event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut) {
        const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS);
        event.currentTarget.dispatchEvent(entryFocusEvent);

        if (!entryFocusEvent.defaultPrevented) {
          const items = [...itemsRef.current.values()].filter((item) => !item.disabled);
          const selectedItemValue = getRatingSelectedItemValue(value, propsRef.current.step);
          const selectedItem = items.find((item) => item.value === selectedItemValue);
          const currentItem = items.find((item) => item.id === tabStopId);

          const candidateItems = [selectedItem, currentItem, ...items].filter(
            Boolean,
          ) as ItemData[];
          const candidateRefs = candidateItems.map((item) => item.ref);
          focusFirst(candidateRefs, false);
        }
      }
      isClickFocusRef.current = false;
    },
    [propsRef, isTabbingBackOut, value, tabStopId],
  );

  const onMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      propsRef.current.onMouseDown?.(event);

      if (event.defaultPrevented) {
        return;
      }

      isClickFocusRef.current = true;
    },
    [propsRef],
  );

  const contextValue = React.useMemo<RatingContextValue>(
    () => ({
      rootId,
      dir,
      orientation,
      activationMode,
      disabled,
      readOnly,
      size,
      max,
      step,
      clearable,
      getAutoIndex,
    }),
    [
      rootId,
      dir,
      orientation,
      activationMode,
      disabled,
      readOnly,
      size,
      max,
      step,
      clearable,
      getAutoIndex,
    ],
  );

  const focusContextValue = React.useMemo<FocusContextValue>(
    () => ({
      tabStopId,
      onItemFocus,
      onItemShiftTab,
      onFocusableItemAdd,
      onFocusableItemRemove,
      onItemRegister,
      onItemUnregister,
      getItems,
    }),
    [
      tabStopId,
      onItemFocus,
      onItemShiftTab,
      onFocusableItemAdd,
      onFocusableItemRemove,
      onItemRegister,
      onItemUnregister,
      getItems,
    ],
  );

  return (
    <StoreContext.Provider value={store}>
      <RatingContext.Provider value={contextValue}>
        <FocusContext.Provider value={focusContextValue}>
          <div
            id={rootId}
            role="radiogroup"
            aria-orientation={orientation}
            data-disabled={disabled ? "" : undefined}
            data-readonly={readOnly ? "" : undefined}
            data-orientation={orientation}
            data-slot="rating"
            dir={dir}
            tabIndex={isTabbingBackOut || focusableItemCount === 0 ? -1 : 0}
            {...rootProps}
            ref={composedRef}
            className={cn(
              "flex gap-1 text-primary outline-none",
              orientation === "horizontal" ? "flex-row items-center" : "flex-col items-start",
              className,
            )}
            onBlur={onBlur}
            onFocus={onFocus}
            onMouseDown={onMouseDown}
          ></div>
          <RatingPartialFillGradient
            dir={dir}
            gradientId={getRatingPartialFillGradientId(rootId, step)}
          />
          {isFormControl && (
            <VisuallyHiddenInput
              type="hidden"
              control={formTrigger}
              name={name}
              value={value}
              disabled={disabled}
              readOnly={readOnly}
              required={required}
            />
          )}
        </FocusContext.Provider>
      </RatingContext.Provider>
    </StoreContext.Provider>
  );
}

interface RatingItemProps extends Omit<React.ComponentProps<"button">, "children"> {
  index?: number;
  children?: React.ReactNode | ((dataState: DataState) => React.ReactNode);
}

function RatingItem(props: RatingItemProps) {
  const {
    index,
    onClick: onClickProp,
    onFocus: onFocusProp,
    onKeyDown: onKeyDownProp,
    onMouseDown: onMouseDownProp,
    onMouseEnter: onMouseEnterProp,
    onMouseMove: onMouseMoveProp,
    onMouseLeave: onMouseLeaveProp,
    disabled,
    className,
    children,
    ref,
    ...itemProps
  } = props;

  const itemRef = React.useRef<ItemElement>(null);
  const composedRef = useComposedRefs(ref, itemRef);

  const context = useRatingContext(ITEM_NAME);

  const instanceId = React.useId();

  const actualIndex = React.useMemo(() => {
    if (index !== undefined) {
      return index;
    }

    return context.getAutoIndex(instanceId);
  }, [index, context, instanceId]);

  const itemValue = actualIndex + 1;
  const store = useStoreContext(ITEM_NAME);
  const focusContext = useFocusContext(ITEM_NAME);
  const value = useStore((state) => state.value);
  const hoveredValue = useStore((state) => state.hoveredValue);
  const { clearable } = context;
  const { step } = context;
  const { activationMode } = context;

  const itemId = getRatingItemId(context.rootId, itemValue);
  const isDisabled = context.disabled || disabled;
  const isReadOnly = context.readOnly;
  const isTabStop = focusContext.tabStopId === itemId;

  const displayValue = hoveredValue ?? value;
  const dataState = getRatingDataState(displayValue, itemValue, step);
  const isFilled = dataState === "full";
  const isPartiallyFilled = dataState === "partial";
  const isHovered = hoveredValue !== null && hoveredValue < itemValue;

  const isMouseClickRef = React.useRef(false);

  const propsRef = useAsRef({
    onClick: onClickProp,
    onFocus: onFocusProp,
    onKeyDown: onKeyDownProp,
    onMouseDown: onMouseDownProp,
    onMouseEnter: onMouseEnterProp,
    onMouseMove: onMouseMoveProp,
    onMouseLeave: onMouseLeaveProp,
  });

  useIsomorphicLayoutEffect(() => {
    focusContext.onItemRegister({
      id: itemId,
      ref: itemRef,
      value: itemValue,
      disabled: !!isDisabled,
    });

    if (!isDisabled) {
      focusContext.onFocusableItemAdd();
    }

    return () => {
      focusContext.onItemUnregister(itemId);
      if (!isDisabled) {
        focusContext.onFocusableItemRemove();
      }
    };
  }, [focusContext, itemId, itemValue, isDisabled]);

  const onClick = React.useCallback(
    (event: React.MouseEvent<ItemElement>) => {
      propsRef.current.onClick?.(event);
      if (event.defaultPrevented) {
        return;
      }

      if (!isDisabled && !isReadOnly) {
        let newValue = itemValue;

        if (step < 1) {
          const rect = event.currentTarget.getBoundingClientRect();
          const clickX = event.clientX - rect.left;
          const isLeftHalf = clickX < rect.width / 2;
          newValue = getRatingHalfStepValue(itemValue, step, context.dir, isLeftHalf);
        }

        if (clearable && value === newValue) {
          newValue = 0;
        }

        store.setState("value", newValue);
      }
    },
    [isDisabled, isReadOnly, clearable, step, value, itemValue, store, context.dir, propsRef],
  );

  const onFocus = React.useCallback(
    (event: React.FocusEvent<ItemElement>) => {
      propsRef.current.onFocus?.(event);
      if (event.defaultPrevented) {
        return;
      }

      focusContext.onItemFocus(itemId);

      const isKeyboardFocus = !isMouseClickRef.current;

      if (!isDisabled && !isReadOnly && activationMode !== "manual" && isKeyboardFocus) {
        // For half-step mode, check if the current value is a half-step that belongs to this item
        // e.g., if value is 3.5 and itemValue is 4, don't change it
        const isHalfStepValue = step < 1 && value === itemValue - step;

        if (!isHalfStepValue) {
          const newValue = clearable && value === itemValue ? 0 : itemValue;
          store.setState("value", newValue);
        }
      }

      isMouseClickRef.current = false;
    },
    [
      focusContext,
      itemId,
      activationMode,
      isDisabled,
      isReadOnly,
      clearable,
      value,
      itemValue,
      step,
      store,
      propsRef,
    ],
  );

  const getFocusableItems = () => focusContext.getItems().filter((item) => !item.disabled);

  const handleManualActivation = (event: React.KeyboardEvent<ItemElement>) => {
    if ((event.key === "Enter" || event.key === " ") && activationMode === "manual") {
      event.preventDefault();
      if (!isDisabled && !isReadOnly && itemRef.current) {
        itemRef.current.click();
      }
      return true;
    }

    return false;
  };

  const handleShiftTab = (event: React.KeyboardEvent<ItemElement>) => {
    if (event.key === "Tab" && event.shiftKey) {
      focusContext.onItemShiftTab();
      return true;
    }

    return false;
  };

  const focusStepIntent = (
    event: React.KeyboardEvent<ItemElement>,
    focusIntent: "prev" | "next",
  ) => {
    if (step >= 1) {
      return false;
    }

    event.preventDefault();

    if (isDisabled || isReadOnly) {
      return true;
    }

    const newValue =
      focusIntent === "next" ? Math.min(value + step, context.max) : Math.max(value - step, 0);

    store.setState("value", newValue);

    const targetItem = getFocusableItems().find(
      (item) => item.value === getRatingSelectedItemValue(newValue, step),
    );

    if (targetItem?.ref.current) {
      queueMicrotask(() => targetItem.ref.current?.focus());
    }

    return true;
  };

  const handleFocusIntentNavigation = (
    event: React.KeyboardEvent<ItemElement>,
    focusIntent: ReturnType<typeof getRatingFocusIntent>,
  ) => {
    if (isModifierKeyPressed(event)) {
      return;
    }

    event.preventDefault();

    if ((focusIntent === "prev" || focusIntent === "next") && focusStepIntent(event, focusIntent)) {
      return;
    }

    const items = getFocusableItems();
    let candidateRefs = items.map((item) => item.ref);

    if (focusIntent === "last") {
      candidateRefs.reverse();
    } else if (focusIntent === "prev" || focusIntent === "next") {
      const currentIndex = candidateRefs.findIndex(
        (candidateRef) => candidateRef.current === event.currentTarget,
      );

      if (focusIntent === "prev") {
        candidateRefs.reverse();
      }

      candidateRefs = candidateRefs.slice(currentIndex + 1);
    }

    queueMicrotask(() => focusFirst(candidateRefs));
  };

  const onKeyDown = (event: React.KeyboardEvent<ItemElement>) => {
    propsRef.current.onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }

    if (handleManualActivation(event)) {
      return;
    }

    if (handleShiftTab(event)) {
      return;
    }

    if (event.target !== event.currentTarget) {
      return;
    }

    const focusIntent = getRatingFocusIntent(event.key, context.dir, context.orientation);
    if (focusIntent === undefined) {
      return;
    }

    handleFocusIntentNavigation(event, focusIntent);
  };

  const onMouseDown = React.useCallback(
    (event: React.MouseEvent<ItemElement>) => {
      propsRef.current.onMouseDown?.(event);
      if (event.defaultPrevented) {
        return;
      }

      isMouseClickRef.current = true;

      if (isDisabled) {
        event.preventDefault();
      } else {
        focusContext.onItemFocus(itemId);
      }
    },
    [focusContext, itemId, isDisabled, propsRef],
  );

  const onMouseEnter = React.useCallback(
    (event: React.MouseEvent<ItemElement>) => {
      propsRef.current.onMouseEnter?.(event);
      if (event.defaultPrevented) {
        return;
      }

      if (!isDisabled && !isReadOnly) {
        let hoverValue = itemValue;

        if (step < 1) {
          const rect = event.currentTarget.getBoundingClientRect();
          const mouseX = event.clientX - rect.left;
          const isLeftHalf = mouseX < rect.width / 2;
          hoverValue = getRatingHalfStepValue(itemValue, step, context.dir, isLeftHalf);
        }

        store.setState("hoveredValue", hoverValue);
      }
    },
    [isDisabled, isReadOnly, step, itemValue, store, context.dir, propsRef],
  );

  const onMouseLeave = React.useCallback(
    (event: React.MouseEvent<ItemElement>) => {
      propsRef.current.onMouseLeave?.(event);
      if (event.defaultPrevented) {
        return;
      }

      if (!isDisabled && !isReadOnly) {
        store.setState("hoveredValue", null);
      }
    },
    [isDisabled, isReadOnly, store, propsRef],
  );

  const onMouseMove = React.useCallback(
    (event: React.MouseEvent<ItemElement>) => {
      propsRef.current.onMouseMove?.(event);
      if (event.defaultPrevented) {
        return;
      }

      if (!isDisabled && !isReadOnly && step < 1) {
        const rect = event.currentTarget.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const isLeftHalf = mouseX < rect.width / 2;
        const hoverValue = getRatingHalfStepValue(itemValue, step, context.dir, isLeftHalf);

        store.setState("hoveredValue", hoverValue);
      }
    },
    [isDisabled, isReadOnly, step, itemValue, store, context.dir, propsRef],
  );

  return (
    <button
      role="radio"
      type="button"
      id={itemId}
      aria-checked={isFilled}
      aria-posinset={itemValue}
      aria-setsize={context.max}
      data-disabled={isDisabled ? "" : undefined}
      data-readonly={isReadOnly ? "" : undefined}
      data-state={dataState}
      data-hovered={isHovered ? "" : undefined}
      data-slot="rating-item"
      disabled={isDisabled}
      tabIndex={isTabStop ? 0 : -1}
      {...itemProps}
      ref={composedRef}
      style={{
        ...itemProps.style,
        ...(isPartiallyFilled && {
          "--partial-fill": `url(#${getRatingPartialFillGradientId(context.rootId, step)})`,
        }),
      }}
      className={cn(
        "inline-flex items-center justify-center rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        "[&_svg:not([class*='size-'])]:size-full [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:transition-colors [&_svg]:duration-200 data-[state=empty]:[&_svg]:fill-transparent data-[state=full]:[&_svg]:fill-current data-[state=partial]:[&_svg]:fill-(--partial-fill)",
        getRatingItemSizeClassName(context.size),
        className,
      )}
      onClick={onClick}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {typeof children === "function" ? children(dataState) : (children ?? <StarIcon />)}
    </button>
  );
}

export { Rating, RatingItem, useStore as useRating };
