//Search bar
const btn = document.getElementById('search-btn');
const input = document.getElementById('search-input');

btn.addEventListener('click', () => {
  input.classList.toggle('active');
  if(input.classList.contains('active')) input.focus();
});

//Move Cards
const container = document.getElementById("cards-container");

// Create 20 cards with unique IDs
for (let i = 1; i <= 20; i++) {
  const card = document.createElement("div");
  card.className = "card";
  card.id = `card-${i}`;
  container.appendChild(card);
}