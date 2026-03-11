import { useEffect, useRef } from "react";

export type FocusableElement = HTMLElement;

type GridEntry = {
    el: FocusableElement;
    row: number;
    col: number;
};

interface NavigationOptions {
    onVerticalNav?: (targetRow: number, col: number) => void;
}

export function useDirectionalNavigation(options: NavigationOptions = {}) {
    const onVerticalNavRef = useRef(options.onVerticalNav);
    const gridMap = useRef<Map<string, GridEntry>>(new Map());
    const modalElementsRef = useRef<FocusableElement[]>([]);
    const lastFocusedRef = useRef<FocusableElement | null>(null);
    const modalOpenRef = useRef<boolean>(false);
    const onEscape = useRef<(() => void) | null>(null);
    const focusFirst = () => {
        const first = Array.from(gridMap.current.values()).sort(
            (a, b) => a.row - b.row || a.col - b.col,
        )[1]; // [0] is always the search bar (row 0), skip it
        first?.el.focus();
    };

    const focusFirstModal = () => {
        modalElementsRef.current[0]?.focus();
    };
    const setLastFocused = (el: HTMLElement | null) => {
        lastFocusedRef.current = el;
    };

    const register = (
        id: string | undefined,
        el: FocusableElement | null,
        row: number,
        col: number,
    ) => {
        const key = id ?? `${row}-${col}`;
        if (!el) {
            const existing = gridMap.current.get(key);
            if (existing)
                gridMap.current.set(key, { ...existing, el: null as any });
            return;
        }
        gridMap.current.set(key, { el, row, col });
    };

    /**
     * Register elements inside a modal (cycled through with arrow keys).
     * Call with null to deregister on unmount.
     */
    const registerModal = (el: FocusableElement | null) => {
        if (!el) {
            modalElementsRef.current = [];
            return;
        }
        if (!modalElementsRef.current.includes(el)) {
            modalElementsRef.current.push(el);
        }
    };

    const setModalOpen = (value: boolean) => {
        modalOpenRef.current = value;
        if (!value && lastFocusedRef.current) {
            onEscape.current = null;
            lastFocusedRef.current.focus();
        }
    };

    const setEscapeHandler = (fn: () => void) => {
        onEscape.current = fn;
    };

    /**
     * Find the element at [targetRow, targetCol].
     * Falls back to the nearest column in the same row if exact match missing.
     */
    const findClosest = (
        targetRow: number,
        targetCol: number,
    ): FocusableElement | null => {
        const entries = Array.from(gridMap.current.values()).filter(
            (e) => e.el && document.contains(e.el),
        );

        const exact = entries.find(
            (e) => e.row === targetRow && e.col === targetCol,
        );
        if (exact) return exact.el;
        const sameRow = entries.filter((e) => e.row === targetRow);
        if (!sameRow.length) return null;

        return sameRow.reduce((closest, entry) => {
            const closestDist = Math.abs(closest.col - targetCol);
            const entryDist = Math.abs(entry.col - targetCol);
            return entryDist < closestDist ? entry : closest;
        }).el;
    };

    useEffect(() => {
        onVerticalNavRef.current = options.onVerticalNav;
    }, [options.onVerticalNav]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const active = document.activeElement as HTMLElement | null;
            if (!active) return;

            // ── Search bar ────────────────────────────────────────────────────
            const searchEl = document.getElementById("search");
            if (active === searchEl) {
                if (e.key === "ArrowDown") {
                    searchEl.blur();
                    findClosest(1, 0)?.focus();
                    e.preventDefault();
                }
                return;
            }

            // ── Modal navigation ──────────────────────────────────────────────
            if (modalOpenRef.current) {
                const list = modalElementsRef.current;
                const index = list.indexOf(active);
                if (index === -1) return;
                let nextIndex = index;
                switch (e.key) {
                    case "ArrowRight":
                    case "ArrowDown":
                        nextIndex = (index + 1) % list.length;
                        break;
                    case "ArrowLeft":
                    case "ArrowUp":
                        nextIndex = (index - 1 + list.length) % list.length;
                        break;
                    case "Enter":
                    case "OK":
                        active.click();
                        e.preventDefault();
                        return;
                    case "Escape":
                        onEscape.current?.();
                        e.preventDefault();
                        return;
                    case "Back":
                        e.preventDefault();
                        return;
                    default:
                        return;
                }
                e.preventDefault();
                list[nextIndex]?.focus();
                return;
            }

            // ── Grid navigation ───────────────────────────────────────────────
            const entries = Array.from(gridMap.current.values()).filter(
                (e) => e.el && document.contains(e.el),
            );
            const current = entries.find((entry) => entry.el === active);
            if (!current) return;

            let next: FocusableElement | null = null;

            switch (e.key) {
                case "ArrowUp":
                    next = findClosest(current.row - 1, current.col);
                    onVerticalNavRef.current?.(current.row - 1, current.col);
                    break;
                case "ArrowDown":
                    next = findClosest(current.row + 1, current.col);
                    onVerticalNavRef.current?.(current.row + 1, current.col);
                    break;
                case "ArrowLeft":
                    next =
                        entries.find(
                            (e) =>
                                e.row === current.row &&
                                e.col === current.col - 1,
                        )?.el ?? findClosest(current.row, 0);
                    break;
                case "ArrowRight":
                    next =
                        entries.find(
                            (e) =>
                                e.row === current.row &&
                                e.col === current.col + 1,
                        )?.el ?? null;
                    break;
                case "Enter":
                case "OK":
                    lastFocusedRef.current = active;
                    active.click();
                    e.preventDefault();
                    return;
                default:
                    return;
            }

            // check next is mounted before focusing
            if (next && document.contains(next)) {
                e.preventDefault();
                lastFocusedRef.current = next;
                next.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return {
        register,
        registerModal,
        setModalOpen,
        focusFirst,
        setEscapeHandler,
        focusFirstModal,
        setLastFocused,
    };
}
