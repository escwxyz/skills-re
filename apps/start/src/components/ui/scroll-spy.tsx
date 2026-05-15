"use client";

import * as React from "react";

import { useComposedRefs } from "@/lib/compose-refs";
import { useAsRef } from "@/hooks/use-as-ref";
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-layout-effect";
import { useLazyRef } from "@/hooks/use-lazy-ref";

const ROOT_NAME = "ScrollSpy";
const NAV_NAME = "ScrollSpyNav";
const LINK_NAME = "ScrollSpyLink";
const VIEWPORT_NAME = "ScrollSpyViewport";
const SECTION_NAME = "ScrollSpySection";

const BOTTOM_THRESHOLD = 80;

type Direction = "ltr" | "rtl";
type Orientation = "horizontal" | "vertical";

interface ScrollSpyTarget {
  getBoundingClientRect: () => { top: number };
  id: string;
}

function getDefaultScrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") {
    return "smooth";
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

interface StoreState {
  value: string;
}

interface Store {
  subscribe: (callback: () => void) => () => void;
  getState: () => StoreState;
  setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
  notify: () => void;
}

const StoreContext = React.createContext<Store | null>(null);

function useStore<T>(selector: (state: StoreState) => T, ogStore?: Store | null): T {
  const contextStore = React.useContext(StoreContext);
  const store = ogStore ?? contextStore;

  if (!store) {
    throw new Error(`\`useStore\` must be used within \`${ROOT_NAME}\``);
  }

  const getSnapshot = React.useCallback(() => selector(store.getState()), [selector, store]);
  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

interface ScrollSpyContextValue {
  offset: number;
  scrollBehavior: ScrollBehavior;
  dir?: Direction;
  orientation: Orientation;
  scrollContainer: HTMLElement | null;
  onSectionRegister: (id: string, element: HTMLElement) => void;
  onSectionUnregister: (id: string) => void;
  onLinkRegister: (id: string) => void;
  onLinkUnregister: (id: string) => void;
  onScrollToSection: (sectionId: string) => void;
}

const ScrollSpyContext = React.createContext<ScrollSpyContextValue | null>(null);

function useScrollSpyContext(consumerName: string) {
  const context = React.useContext(ScrollSpyContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
  }
  return context;
}

interface ScrollSpyProps extends React.ComponentProps<"div"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  offset?: number;
  scrollBehavior?: ScrollBehavior;
  scrollContainer?: HTMLElement | null;
  dir?: Direction;
  orientation?: Orientation;
}

function ScrollSpy(props: ScrollSpyProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    offset = 0,
    scrollBehavior = getDefaultScrollBehavior(),
    scrollContainer = null,
    dir,
    orientation = "horizontal",
    className,
    children,
    ...rootProps
  } = props;

  const stateRef = useLazyRef<StoreState>(() => ({
    value: value ?? defaultValue ?? "",
  }));
  const listenersRef = useLazyRef(() => new Set<() => void>());
  const onValueChangeRef = useAsRef(onValueChange);

  const store = React.useMemo<Store>(
    () => ({
      // oxlint-disable-next-line promise/prefer-await-to-callbacks
      subscribe: (cb) => {
        listenersRef.current.add(cb);
        return () => listenersRef.current.delete(cb);
      },
      getState: () => stateRef.current,
      setState: (key, nextValue) => {
        if (Object.is(stateRef.current[key], nextValue)) {
          return;
        }

        stateRef.current[key] = nextValue;

        if (key === "value" && nextValue) {
          onValueChangeRef.current?.(nextValue);
        }

        store.notify();
      },
      notify: () => {
        for (const cb of listenersRef.current) {
          // oxlint-disable-next-line promise/prefer-await-to-callbacks
          cb();
        }
      },
    }),
    [listenersRef, onValueChangeRef, stateRef],
  );

  const sectionMapRef = React.useRef(new Map<string, HTMLElement>());
  const linkValuesRef = React.useRef(new Set<string>());
  const rafIdRef = React.useRef<number | null>(null);
  const isMountedRef = React.useRef(false);
  const [registryVersion, setRegistryVersion] = React.useState(0);

  const bumpRegistryVersion = React.useCallback(() => {
    setRegistryVersion((current) => current + 1);
  }, []);

  const resolveTarget = React.useCallback(
    (sectionId: string) =>
      scrollContainer
        ? scrollContainer.querySelector<HTMLElement>(`#${CSS.escape(sectionId)}`)
        : document.querySelector<HTMLElement>(`#${CSS.escape(sectionId)}`),
    [scrollContainer],
  );

  const getObservedTargets = React.useCallback(() => {
    const orderedTargets = [...linkValuesRef.current]
      .map((sectionId) => sectionMapRef.current.get(sectionId) ?? resolveTarget(sectionId))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);

    if (orderedTargets.length > 0) {
      return orderedTargets;
    }

    return [...sectionMapRef.current.values()];
  }, [resolveTarget]);

  const syncActiveValue = React.useCallback(() => {
    const targets = getObservedTargets();
    if (targets.length === 0) {
      return;
    }

    const nextValue = getScrollSpyActiveValue(targets, scrollContainer, offset);
    if (nextValue) {
      store.setState("value", nextValue);
    }
  }, [getObservedTargets, offset, scrollContainer, store]);

  const onSectionRegister = React.useCallback(
    (id: string, element: HTMLElement) => {
      const current = sectionMapRef.current.get(id);
      if (current === element) {
        return;
      }

      sectionMapRef.current.set(id, element);
      bumpRegistryVersion();
    },
    [bumpRegistryVersion],
  );

  const onSectionUnregister = React.useCallback(
    (id: string) => {
      if (!sectionMapRef.current.delete(id)) {
        return;
      }
      bumpRegistryVersion();
    },
    [bumpRegistryVersion],
  );

  const onLinkRegister = React.useCallback(
    (id: string) => {
      if (linkValuesRef.current.has(id)) {
        return;
      }
      linkValuesRef.current.add(id);
      bumpRegistryVersion();
    },
    [bumpRegistryVersion],
  );

  const onLinkUnregister = React.useCallback(
    (id: string) => {
      if (!linkValuesRef.current.delete(id)) {
        return;
      }
      bumpRegistryVersion();
    },
    [bumpRegistryVersion],
  );

  const onScrollToSection = React.useCallback(
    (sectionId: string) => {
      const section = resolveTarget(sectionId);

      if (!section) {
        store.setState("value", sectionId);
        return;
      }

      store.setState("value", sectionId);

      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        const { scrollTop } = scrollContainer;
        const offsetPosition = sectionRect.top - containerRect.top + scrollTop - offset;

        scrollContainer.scrollTo({
          top: offsetPosition,
          behavior: scrollBehavior,
        });
        return;
      }

      const offsetPosition = section.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: scrollBehavior,
      });
    },
    [offset, resolveTarget, scrollBehavior, scrollContainer, store],
  );

  useIsomorphicLayoutEffect(() => {
    const currentValue = value ?? defaultValue;
    if (currentValue === undefined) {
      return;
    }

    if (!isMountedRef.current) {
      isMountedRef.current = true;
      store.setState("value", currentValue);
      return;
    }

    onScrollToSection(currentValue);
  }, [defaultValue, onScrollToSection, store, value]);

  useIsomorphicLayoutEffect(() => {
    syncActiveValue();
  }, [registryVersion, syncActiveValue]);

  useIsomorphicLayoutEffect(() => {
    const updateActiveValue = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        syncActiveValue();
      });
    };

    updateActiveValue();

    const target = scrollContainer ?? window;
    target.addEventListener("scroll", updateActiveValue, { passive: true });
    window.addEventListener("resize", updateActiveValue, { passive: true });

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      target.removeEventListener("scroll", updateActiveValue);
      window.removeEventListener("resize", updateActiveValue);
    };
  }, [scrollContainer, syncActiveValue]);

  const contextValue = React.useMemo<ScrollSpyContextValue>(
    () => ({
      dir,
      orientation,
      offset,
      scrollBehavior,
      scrollContainer,
      onSectionRegister,
      onSectionUnregister,
      onLinkRegister,
      onLinkUnregister,
      onScrollToSection,
    }),
    [
      dir,
      offset,
      onLinkRegister,
      onLinkUnregister,
      onScrollToSection,
      onSectionRegister,
      onSectionUnregister,
      orientation,
      scrollBehavior,
      scrollContainer,
    ],
  );

  return (
    <StoreContext.Provider value={store}>
      <ScrollSpyContext.Provider value={contextValue}>
        <div
          data-orientation={orientation}
          data-slot="scroll-spy"
          dir={dir}
          {...rootProps}
          className={className}
        >
          {children}
        </div>
      </ScrollSpyContext.Provider>
    </StoreContext.Provider>
  );
}

function ScrollSpyNav(props: React.ComponentProps<"nav">) {
  const { className, ...navProps } = props;
  const { dir, orientation } = useScrollSpyContext(NAV_NAME);

  return (
    <nav
      data-orientation={orientation}
      data-slot="scroll-spy-nav"
      dir={dir}
      {...navProps}
      className={className}
    />
  );
}

interface ScrollSpyLinkProps extends React.ComponentProps<"a"> {
  value: string;
}

function ScrollSpyLink(props: ScrollSpyLinkProps) {
  const { value: linkValue, onClick, className, children, ...linkProps } = props;

  const { orientation, onLinkRegister, onLinkUnregister, onScrollToSection } =
    useScrollSpyContext(LINK_NAME);
  const value = useStore((state) => state.value);
  const isActive = value === linkValue;

  useIsomorphicLayoutEffect(() => {
    onLinkRegister(linkValue);
    return () => onLinkUnregister(linkValue);
  }, [linkValue, onLinkRegister, onLinkUnregister]);

  const onLinkClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onClick?.(event);
      onScrollToSection(linkValue);
    },
    [linkValue, onClick, onScrollToSection],
  );

  return (
    <a
      data-orientation={orientation}
      data-slot="scroll-spy-link"
      data-state={isActive ? "active" : "inactive"}
      aria-current={isActive ? "true" : undefined}
      {...linkProps}
      href={`#${linkValue}`}
      className={className}
      onClick={onLinkClick}
    >
      {children}
    </a>
  );
}

function ScrollSpyViewport(props: React.ComponentProps<"div">) {
  const { className, ...viewportProps } = props;
  const { dir, orientation } = useScrollSpyContext(VIEWPORT_NAME);

  return (
    <div
      data-orientation={orientation}
      data-slot="scroll-spy-viewport"
      dir={dir}
      {...viewportProps}
      className={className}
    />
  );
}

interface ScrollSpySectionProps extends React.ComponentProps<"div"> {
  value: string;
}

function ScrollSpySection(props: ScrollSpySectionProps) {
  const { ref, value, children, className, ...sectionProps } = props;
  const { orientation, onSectionRegister, onSectionUnregister } = useScrollSpyContext(SECTION_NAME);
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const composedRef = useComposedRefs(ref, sectionRef);

  useIsomorphicLayoutEffect(() => {
    const element = sectionRef.current;
    if (!element || !value) {
      return;
    }

    onSectionRegister(value, element);
    return () => onSectionUnregister(value);
  }, [value, onSectionRegister, onSectionUnregister]);

  return (
    <div
      data-orientation={orientation}
      data-slot="scroll-spy-section"
      {...sectionProps}
      id={value}
      ref={composedRef}
      className={className}
    >
      {children}
    </div>
  );
}

const getScrollState = (scrollContainer: HTMLElement | null) => {
  if (scrollContainer) {
    return {
      remaining:
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight,
      scrolled: scrollContainer.scrollTop,
    };
  }

  const scrollingElement = document.scrollingElement ?? document.documentElement;
  return {
    remaining:
      scrollingElement.scrollHeight - scrollingElement.scrollTop - scrollingElement.clientHeight,
    scrolled: scrollingElement.scrollTop,
  };
};

export const getScrollSpyActiveValue = (
  targets: ScrollSpyTarget[],
  scrollContainer: HTMLElement | null = null,
  offset = 0,
) => {
  if (targets.length === 0) {
    return null;
  }

  const { remaining, scrolled } = getScrollState(scrollContainer);
  if (scrolled > 0 && remaining <= BOTTOM_THRESHOLD) {
    return targets.at(-1)?.id ?? null;
  }

  let activeValue = targets[0]?.id ?? null;

  for (const target of targets) {
    if (target.getBoundingClientRect().top <= offset) {
      activeValue = target.id;
      continue;
    }

    break;
  }

  return activeValue;
};

export {
  ScrollSpy,
  ScrollSpyLink,
  ScrollSpyNav,
  type ScrollSpyProps,
  ScrollSpySection,
  ScrollSpyViewport,
};
