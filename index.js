// Elements
const container = document.getElementById("card-container");
const leftArrowBtn = document.getElementById("scroll-btn-left");
const rightArrowBtn = document.getElementById("scroll-btn-right");

// Placeholder dataset for testing
const movies = new Array(50).fill(null).map(() => ({
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
  img.style.height = "75%";
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
// Collect all interactive elements
const searchBar = document.getElementById("search");
const cards = Array.from(document.querySelectorAll("#card-container .card"));
const categories = Array.from(document.querySelectorAll(".smaller-card"));

// Assign row/col for navigation
// Row 0: search bar
searchBar.dataset.row = 0;
searchBar.dataset.col = 0;

// Rows 1-2: movie grid
const rows = 2;
cards.forEach((card, i) => {
    card.dataset.row = Math.floor(i / cards.length * rows) + 1; // row 1 or 2
    card.dataset.col = i; // column index
});

// Row 3: category buttons
categories.forEach((btn, i) => {
    btn.dataset.row = 3;
    btn.dataset.col = i;
});

// Handle arrow key navigation
document.addEventListener("keydown", (e) => {
    const focused = document.activeElement;
    if (!focused.dataset) return;

    let row = parseInt(focused.dataset.row);
    let col = parseInt(focused.dataset.col);
    let next;

    switch(e.key) {
        case "ArrowUp":
            next = document.querySelector(`[data-row='${row-1}'][data-col='${col}']`) 
                || document.querySelector(`[data-row='${row-1}']`);
            break;
        case "ArrowDown":
            next = document.querySelector(`[data-row='${row+1}'][data-col='${col}']`) 
                || document.querySelector(`[data-row='${row+1}']`);
            break;
        case "ArrowLeft":
            next = document.querySelector(`[data-row='${row}'][data-col='${col-1}']`) 
                || document.querySelector(`[data-row='${row}'][data-col='0']`);
            break;
        case "ArrowRight":
            next = document.querySelector(`[data-row='${row}'][data-col='${col+1}']`) 
                || document.querySelector(`[data-row='${row}'][data-col='0']`);
            break;
    }

    if(next) {
        next.focus();
        e.preventDefault(); // prevent page scrolling
    }
});

// Focus first card by default if nothing is focused
window.addEventListener("keydown", (e) => {
    if (document.activeElement === document.body) {
        cards[0]?.focus();
    }
}, { once: true });


// Buttons simulate arrow keys
leftArrowBtn.addEventListener('click', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: "ArrowLeft" }));
});
rightArrowBtn.addEventListener('click', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: "ArrowRight" }));
});
