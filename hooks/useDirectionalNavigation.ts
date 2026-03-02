import { useEffect, useRef } from "react";

export type FocusableElement = HTMLElement;

export function useDirectionalNavigation() {
  const elementsRef = useRef<FocusableElement[]>([]);
  const modalRef = useRef<FocusableElement[]>([]);
  const lastFocused = useRef<FocusableElement | null>(null);

  // Register elements (cards, buttons, back, categories)
  const register = (el: FocusableElement | null) => {
    if (el && !elementsRef.current.includes(el)) {
      elementsRef.current.push(el);
    }
  };

  const registerModal = (el: FocusableElement | null) => {
    if (el && !modalRef.current.includes(el)) {
      modalRef.current.push(el);
    }
  };

  // Focus an element by index
  const focusIndex = (index: number, isModal = false) => {
    const target = isModal ? modalRef.current[index] : elementsRef.current[index];
    if (target) {
      target.focus();
      lastFocused.current = target;
    }
  };

  // Find closest in vertical direction
  const findClosestVertical = (direction: "up" | "down", isModal = false) => {
    const list = isModal ? modalRef.current : elementsRef.current;
    if (!lastFocused.current || !list.length) return;
    const rect = lastFocused.current.getBoundingClientRect();
    let candidates: { el: FocusableElement; dist: number }[] = [];

    list.forEach((el) => {
      if (el === lastFocused.current) return;
      const r = el.getBoundingClientRect();
      const verticalDist = r.top - rect.top;
      if (direction === "down" && verticalDist > 0) candidates.push({ el, dist: verticalDist });
      if (direction === "up" && verticalDist < 0) candidates.push({ el, dist: Math.abs(verticalDist) });
    });

    if (candidates.length === 0) return;
    candidates.sort((a, b) => a.dist - b.dist);
    candidates[0].el.focus();
    lastFocused.current = candidates[0].el;
  };

  // Global key handler
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!elementsRef.current.length) return;

    const isModalOpen = modalRef.current.length > 0 && modalRef.current.some(el => el.offsetParent !== null);
    const list = isModalOpen ? modalRef.current : elementsRef.current;

    if (!lastFocused.current && list.length) {
      lastFocused.current = list[0];
      lastFocused.current.focus();
    }

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        if (!lastFocused.current) return;
        {
          const i = list.indexOf(lastFocused.current);
          const next = list[(i + 1) % list.length];
          next.focus();
          lastFocused.current = next;
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (!lastFocused.current) return;
        {
          const i = list.indexOf(lastFocused.current);
          const next = list[(i - 1 + list.length) % list.length];
          next.focus();
          lastFocused.current = next;
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        findClosestVertical("down", isModalOpen);
        break;
      case "ArrowUp":
        e.preventDefault();
        findClosestVertical("up", isModalOpen);
        break;
      case "Enter":
        e.preventDefault();
        lastFocused.current?.click();
        break;
      case "Escape":
        if (isModalOpen) {
          e.preventDefault();
          modalRef.current.forEach(el => el.blur());
        }
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  return { register, registerModal, lastFocused, focusIndex };
}