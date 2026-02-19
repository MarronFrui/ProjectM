// App.tsx
import { contentDB, ContentItem } from '../config';
import CardsContainer from './RenderCards';
import { useState, useEffect } from 'react';

export default function App() {
  const [availableCards, setAvailableCards] = useState<ContentItem[]>([]);
  const [unavailableCards, setUnavailableCards] = useState<ContentItem[]>([]);  

  useEffect(() => {
    const available = contentDB.filter(item => item.available); 
    const unavailable = contentDB.filter(item => !item.available);  
    setAvailableCards(available);
    setUnavailableCards(unavailable);
  }, []);

  return (
    <>
      <header>
        <h1>Homemade Netflix</h1>
      </header>

      <div className="search-container">
        <input className="search-bar" type="text" id="search" placeholder="Search movies..." tabIndex={0} />
      </div>

      <main id="movie-grid">
        <div className="carousel-container">
          <section className="available">
            <h2>Available</h2>
            <CardsContainer cards={availableCards} containerId="available-cards" />
          </section>
          <section className="unavailable">
            <h2>Unavailable</h2>
            <CardsContainer cards={unavailableCards} containerId="unavailable-cards" />
          </section>
        </div>
      </main>

      <div className="preview" id="preview-modal">
        <div id="preview-content">
          <button id="close-preview">✖</button>
          <img id="preview-image" src="/content-info/poster/default.jpg" alt="" />
          <h3 id="preview-name"></h3>
          <p id="preview-description"></p>
          <p id="preview-duration"></p>
          <p id="preview-seasons-episodes"></p>
          <div className="preview-actions">
            <button id="play-button">Play</button>
            <button id="add-to-wishlist">Add to wishlist</button>
          </div>
        </div>
      </div>

      <section className="categorie">
        <h2>Categories</h2>
        <div className="carousel-container">
          <div className="smaller-card-container">
            <div className="smaller-card" tabIndex={0}><a href="index.html">Home</a></div>
            <div className="smaller-card" tabIndex={0}><a href="categories.html">Categories</a></div>
            <div className="smaller-card" tabIndex={0}><a href="whishlist.html">Whishlist</a></div>
          </div>
        </div>
      </section>
    </>
  );
}
