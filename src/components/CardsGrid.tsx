import { useState, useCallback, useEffect } from "react";
import { ContentItem } from "../../config";
import Card from "./Card";

const COLS_VISIBLE = 10;
const COLS_BUFFER = 2;
const COLS_TOTAL = COLS_VISIBLE + COLS_BUFFER * 2; // 14 cols = 28 cards
const TRIGGER = 3; // load when focused col is 3 from edge


interface Props {
    items: ContentItem[];
    onSelect: (item: ContentItem) => void;
    wishlist: string[];
    toggleWishlist: (id: string) => void;
    register: (id: string | undefined, el: HTMLElement | null, row: number, col: number) => void;
    baseRow: number;
}

export default function CardsGrid({
    items,
    onSelect,
    wishlist,
    toggleWishlist,
    register,
    baseRow,
}: Props) {
    const CARD_ROWS = 2;
    const totalCols = Math.ceil(items.length / CARD_ROWS);
    

    // visible window in column units
    const [range, setRange] = useState({
        start: 0,
        end: Math.min(COLS_TOTAL, totalCols),
    });

    useEffect(() => {
    if (items.length > 0 && range.end === 0) {
        setRange({ start: 0, end: Math.min(COLS_TOTAL, totalCols) });
    }
}, [items.length]);

    // called by each card when it receives focus
    const onCardFocus = useCallback((col: number) => {
        setRange((prev) => {
            let { start, end } = prev;

            // approaching right edge → expand right
            if (col >= end - TRIGGER && end < totalCols) {
                end = Math.min(end + COLS_BUFFER, totalCols);
                // unload left buffer if window is getting large
                if (end - start > COLS_TOTAL) {
                    start = end - COLS_TOTAL;
                }
            }

            // approaching left edge → expand left
            if (col <= start + TRIGGER && start > 0) {
                start = Math.max(start - COLS_BUFFER, 0);
                // unload right buffer if window is getting large
                if (end - start > COLS_TOTAL) {
                    end = start + COLS_TOTAL;
                }
            }

            // no change — avoid re-render
            if (start === prev.start && end === prev.end) return prev;
            return { start, end };
        });
    }, [totalCols]);

    // slice items to current visible window (col range → item index range)
    const visibleItems = items.slice(range.start * CARD_ROWS, range.end * CARD_ROWS);

    return (
        <div className="card-container">
            {visibleItems.map((item, i) => {
                // map back to absolute index within full items array
                const absoluteIndex = range.start * CARD_ROWS + i;
                const col = Math.floor(absoluteIndex / CARD_ROWS) ;
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
}