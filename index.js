//Move Cards
const container = document.getElementById("card-container");
const leftArrowBtn = document.getElementById("scroll-btn-left")
const rightArrowBtn = document.getElementById("scroll-btn-right")


//Create 20 cards with unique IDs
for (let i = 1; i <= 20; i++) {
  const card = document.createElement("div");
  card.className = "card";
  card.id = `card-${i}`;
  card.tabIndex=0;
  container.appendChild(card);
}

container.querySelectorAll(".card").forEach(card => {
  card.addEventListener("click", () => card.focus());
});

//Allow keyboard / remote arrows to move in the menu

window.addEventListener('load', () => {
  const firstCard = document.querySelector('#card-container .card');
  if (firstCard) firstCard.focus();
});

document.addEventListener("keydown", (e) => {
  const currentFocus = Array.from(container.children);
  const focused = document.activeElement;
  const idx = currentFocus.indexOf(focused);
  if (!focused.classList.contains("card")) return;

  let next;
  switch(e.key) {
    case "ArrowRight": next = currentFocus[idx+1]; break;
    case "ArrowLeft": next = currentFocus[idx-1]; break;
    case "ArrowDown": next = currentFocus[idx+5]; break; // adjust visible row
    case "ArrowUp": next = currentFocus[idx-5]; break;
  }
  if(next) next.focus();
});

//Enable Arrow buttons
leftArrowBtn.addEventListener('click', () => {
  const event = new KeyboardEvent('keydown', { key: "ArrowLeft" });
  document.dispatchEvent(event);
});

rightArrowBtn.addEventListener('click', () => {
  const event = new KeyboardEvent('keydown', { key: "ArrowRight" });
  document.dispatchEvent(event);
});