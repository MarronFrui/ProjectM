import { useEffect, useRef } from 'react';
import { renderCards} from '../navigation';
import { ContentItem } from '../config'

interface Props {
  cards: ContentItem[];
  containerId: 'available-cards' | 'unavailable-cards';
}

export default function CardsContainer({ cards, containerId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      renderCards(cards, containerRef.current);
    }
  }, [cards]);

  return <div ref={containerRef} id={containerId} className="card-container" />;
}