import { ContentItem } from "../../config";
import Card from "./Card";

interface Props {
  items: ContentItem[];
  onSelect: (item: ContentItem) => void;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
}

export default function CardsGrid({
  items,
  onSelect,
  wishlist,
  toggleWishlist
}: Props) {
  return (
    <div className="card-container">
      {items.map(item => (
        <Card
          key={item.id}
          item={item}
          onSelect={() => onSelect(item)}
          wishlist={wishlist}
          toggleWishlist={toggleWishlist}
        />
      ))}
    </div>
  );
}
