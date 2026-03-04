import { useEffect, useRef } from "react";

export type FocusableElement = HTMLElement;

type GridEntry = {
    el: FocusableElement;
    row: number;
    col: number;
};

export function useDirectionalNavigation() {
    const gridMap = useRef<Map<string, GridEntry>>(new Map());
    const modalElementsRef = useRef<FocusableElement[]>([]);
    const lastFocusedRef = useRef<FocusableElement | null>(null);
    const modalOpenRef = useRef<boolean>(false);

    /**
     * Register a card or focusable element by its stable ID.
     * Called as a ref callback: ref={(el) => register(item.id, el, row, col)}
     * React calls this with null on unmount. we clean up automatically.
     */
    const register = (
        id: string  | undefined,
        el: FocusableElement | null,
        row: number,
        col: number,
    ) => {
        const key = id ?? `${row}-${col}`;
        if (!el) {
            gridMap.current.delete(key);
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
            modalElementsRef.current = modalElementsRef.current.filter(
                (item) => item !== el,
            );
            return;
        }
        if (!modalElementsRef.current.includes(el)) {
            modalElementsRef.current.push(el);
        }
    };

    const setModalOpen = (value: boolean) => {
        modalOpenRef.current = value;
        if (!value && lastFocusedRef.current) {
            // Return focus to the card that opened the modal
            lastFocusedRef.current.focus();
        }
    };

    /**
     * Find the element at [targetRow, targetCol].
     * Falls back to the nearest column in the same row if exact match missing.
     */
    const findClosest = (
        targetRow: number,
        targetCol: number,
    ): FocusableElement | null => {
        const entries = Array.from(gridMap.current.values());

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
        const handleKeyDown = (e: KeyboardEvent) => {
            const active = document.activeElement as HTMLElement | null;
            if (!active) return;

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
                    case "Back":
                        setModalOpen(false);
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
            const entries = Array.from(gridMap.current.values());
            const current = entries.find((entry) => entry.el === active);
            if (!current) return;

            let next: FocusableElement | null = null;

            switch (e.key) {
                case "ArrowUp":
                    next = findClosest(current.row - 1, current.col);
                    break;
                case "ArrowDown":
                    next = findClosest(current.row + 1, current.col);
                    break;
                case "ArrowLeft":
                    // Try exact col-1, fall back to col 0 of same row
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

            if (next) {
                e.preventDefault();
                lastFocusedRef.current = next;
                next.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return { register, registerModal, setModalOpen };
}
