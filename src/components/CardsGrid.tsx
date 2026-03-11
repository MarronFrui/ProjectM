import { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { ContentItem } from "../../config";
import Card from "./Card";

const COLS_VISIBLE = 10;
const COLS_BUFFER = 2;
const COLS_TOTAL = COLS_VISIBLE + COLS_BUFFER * 2;
const TRIGGER = 3;

export interface CardsGridHandle {
    ensureColVisible: (col: number) => void;
}

interface Props {
    items: ContentItem[];
    onSelect: (item: ContentItem) => void;
    wishlist: string[];
    toggleWishlist: (id: string) => void;
    register: (id: string | undefined, el: HTMLElement | null, row: number, col: number) => void;
    baseRow: number;
}

const CardsGrid = forwardRef<CardsGridHandle, Props>(({
    items,
    onSelect,
    wishlist,
    toggleWishlist,
    register,
    baseRow,
}, ref) => {
    const CARD_ROWS = 2;
    const totalCols = Math.ceil(items.length / CARD_ROWS);

    const [range, setRange] = useState({ start: 0, end: 0 });

    useEffect(() => {
        if (items.length > 0 && range.end === 0) {
            setRange({ start: 0, end: Math.min(COLS_TOTAL, totalCols) });
        }
    }, [items.length]);

    const ensureColVisible = useCallback((col: number) => {
        setRange((prev) => {
            if (col >= prev.start && col < prev.end) return prev;
            const half = Math.floor(COLS_TOTAL / 2);
            const start = Math.max(0, col - half);
            const end = Math.min(totalCols, start + COLS_TOTAL);
            return { start, end };
        });
    }, [totalCols]);

    // expose ensureColVisible to parent
    useImperativeHandle(ref, () => ({ ensureColVisible }), [ensureColVisible]);

    const onCardFocus = useCallback((col: number) => {
        setRange((prev) => {
            let { start, end } = prev;
            if (col >= end - TRIGGER && end < totalCols) {
                end = Math.min(end + COLS_BUFFER, totalCols);
                if (end - start > COLS_TOTAL) start = end - COLS_TOTAL;
            }
            if (col <= start + TRIGGER && start > 0) {
                start = Math.max(start - COLS_BUFFER, 0);
                if (end - start > COLS_TOTAL) end = start + COLS_TOTAL;
            }
            if (start === prev.start && end === prev.end) return prev;
            return { start, end };
        });
    }, [totalCols]);

    const visibleItems = items.slice(range.start * CARD_ROWS, range.end * CARD_ROWS);

    return (
        <div className="card-container">
            {visibleItems.map((item, i) => {
                const absoluteIndex = range.start * CARD_ROWS + i;
                const col = Math.floor(absoluteIndex / CARD_ROWS);
                const row = (absoluteIndex % CARD_ROWS) + baseRow;
                return (
                    <Card
                        key={item.id}
                        item={item}
                        onSelect={() => onSelect(item)}
                        wishlist={wishlist}
                        toggleWishlist={toggleWishlist}
                        ref={(el) => register(item.id, el, row, col)}
                        onFocus={() => onCardFocus(col)}
                    />
                );
            })}
        </div>
    );
});

CardsGrid.displayName = "CardsGrid";
export default CardsGrid;