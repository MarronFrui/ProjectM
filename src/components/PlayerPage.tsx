import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadContentDB, ContentItem } from "../../config";

export default function PlayerPage() {
  const { id } = useParams();
  const [item, setItem] = useState<ContentItem | null>(null);

  useEffect(() => {
    loadContentDB().then(db => {
      const found = db.find(x => x.id === id);
      if (found) setItem(found);
    });
  }, [id]);

  if (!item) return <div>Loading...</div>;

  return (
    <>
      <h2>{item.name}</h2>
      {item.filePath ? (
        <video controls autoPlay src={item.filePath} />
      ) : (
        <p>No media file available.</p>
      )}
    </>
  );
}
