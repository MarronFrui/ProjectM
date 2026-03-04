import { ContentItem } from "../../config";
import Card from "./Card";

interface Props {
  items: ContentItem[];
  onSelect: (item: ContentItem) => void;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  register: (id: string | undefined, el: HTMLElement | null, row: number, col: number) => void; // ← fix this line
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
  const cardRows = 2;

  return (
    <div className="card-container">
      {items.map((item, i) => {
        const row = (i % cardRows) + baseRow;
        const col = Math.floor(i / cardRows);

        return (
          <Card
            key={item.id}
            item={item}
            onSelect={() => onSelect(item)}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
            ref={(el) => register(item.id, el, row, col)}
          />
        );
      })}
    </div>
  );
}