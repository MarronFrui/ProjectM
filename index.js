// Elements
const container = document.getElementById("card-container");
const leftArrowBtn = document.getElementById("scroll-btn-left");
const rightArrowBtn = document.getElementById("scroll-btn-right");

// Placeholder dataset for testing
const movies = new Array(20).fill(null).map(() => ({
  name: null,
  image: null,
  description: null
}));

// Populate cards
movies.forEach((movie, i) => {
  const card = document.createElement("div");
  card.className = "card";
  card.id = `card-${i+1}`;
  card.tabIndex = 0;

  // Image
  const img = document.createElement("img");
  img.src = movie.image || './content_info/images/default.jpg';
  img.alt = movie.name || "Default Movie";
  img.onerror = () => img.src = './content_info/images/default.jpg';
  img.style.width = "100%";
  img.style.height = "85%";
  img.style.borderRadius = "2rem 2rem 0 0";
  img.style.objectFit = "cover";

  // Title
  const title = document.createElement("h3");
  title.textContent = movie.name || "Unknown Title";
  title.style.textAlign = "center";
  title.style.margin = "0.5rem 0";

  // Description
  const desc = document.createElement("p");
  desc.textContent = movie.description || "No description available.";
  desc.style.fontSize = "0.8rem";
  desc.style.textAlign = "center";
  desc.style.margin = "0 0.5rem";

  card.appendChild(img);
  card.appendChild(title);
  card.appendChild(desc);
  container.appendChild(card);

  // Click focuses the card
  card.addEventListener("click", () => card.focus());
});

// Default focus on first card
window.addEventListener('load', () => {
  const firstCard = container.querySelector('.card');
  if (firstCard) firstCard.focus();
});

// Arrow key navigation
document.addEventListener("keydown", (e) => {
  const cards = Array.from(container.children);
  const focused = document.activeElement;
  const idx = cards.indexOf(focused);
  if (!focused.classList.contains("card")) return;

  let next;
  switch(e.key) {
    case "ArrowRight": next = cards[idx+1]; break;
    case "ArrowLeft": next = cards[idx-1]; break;
    case "ArrowDown": next = cards[idx+5]; break; // 5 cards per "row"
    case "ArrowUp": next = cards[idx-5]; break;
  }
  if(next) next.focus();
});

// Buttons simulate arrow keys
leftArrowBtn.addEventListener('click', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: "ArrowLeft" }));
});
rightArrowBtn.addEventListener('click', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: "ArrowRight" }));
});
