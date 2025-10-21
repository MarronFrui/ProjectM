//Move Cards
const container = document.getElementById("cards-container");


//Create 20 cards with unique IDs
for (let i = 1; i <= 20; i++) {
  const card = document.createElement("div");
  card.className = "card";
  card.id = `card-${i}`;
  card.tabIndex=0;
  container.appendChild(card);
}

container.children[0].focus();

container.querySelectorAll(".card").forEach(card => {
  card.addEventListener("click", () => card.focus());
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