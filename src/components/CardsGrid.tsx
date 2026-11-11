import { useState, useCallback, useEffect } from "react";
import { ContentItem } from "../../config";
import Card from "./Card";

const CARD_ROWS = 2;
const COLS_VISIBLE = 10;
const COLS_BUFFER = 2;
const COLS_TOTAL = COLS_VISIBLE + COLS_BUFFER * 2;
const TRIGGER = 3;

interface Props {
    items: ContentItem[];
    onSelect: (item: ContentItem) => void;
    wishlist: string[];
    toggleWishlist: (id: string) => void;
    register: (
        id: string | undefined,
        el: HTMLElement | null,
        row: number,
        col: number,
    ) => void;
    baseRow: number;
    searchActive?: boolean;
}

export default function CardsGrid({
    items,
    onSelect,
    wishlist,
    toggleWishlist,
    register,
    baseRow,
    searchActive,
}: Props) {
    const totalCols = Math.ceil(items.length / CARD_ROWS);
    const [range, setRange] = useState({ start: 0, end: 0 });

    // Reset the virtualization window whenever the item list changes
    // (category switch, search, …) so previously blank grids recover.
    useEffect(() => {
        const end = Math.min(COLS_TOTAL, totalCols);
        setRange((prev) =>
            prev.start === 0 && prev.end === end ? prev : { start: 0, end },
        );
    }, [items, totalCols]);

    const onCardFocus = useCallback(
        (col: number) => {
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
        },
        [totalCols],
    );

    // While searching, render everything and index columns absolutely;
    // the virtualization window would otherwise shift the registered
    // row/col coordinates and break arrow-key navigation.
    const visibleItems = searchActive
        ? items
        : items.slice(range.start * CARD_ROWS, range.end * CARD_ROWS);

    return (
        <div className="cards-row">
            {visibleItems.map((item, i) => {
                const absoluteIndex = searchActive ? i : range.start * CARD_ROWS + i;
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
}
