// ======= Content Dataset =======
const contentDB = new Array(200).fill(null).map((_, i) => ({
    id: `item-${i+1}`,
    name: `title ${i}`,
    category: ["Film", "Serie", "Documentaire"][i % 3],
    available: Math.random() > 0.5 // placeholder
}));

let wishlist = [];

// ======= DOM Elements =======
const containerAvailable = document.getElementById("available-cards") || document.getElementById("card-container");
const containerUnavailable = document.getElementById("unavailable-cards");
const searchBar = document.getElementById("search");
const categories = Array.from(document.querySelectorAll(".smaller-card"));
const isCategoryPage = !!document.querySelector(".disponibility-container");
const movieGrid = document.getElementById("movie-grid");

if (isCategoryPage && movieGrid) movieGrid.style.height = "auto";

// ======= Render Cards =======
function renderCards(cards, container) {
    if (!container) return;
    container.innerHTML = "";

    const isUnavailable = container === containerUnavailable;
    const isAvailable = container === containerAvailable;

    cards.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";
        card.tabIndex = 0;
        card.dataset.id = item.id;

        const img = document.createElement("img");
        img.src = './content_info/images/default.jpg';
        img.alt = item.name;
        img.style.width = "100%";
        img.style.height = "75%";
        img.style.objectFit = "cover";
        card.appendChild(img);

        const title = document.createElement("h3");
        title.textContent = item.name;
        title.style.textAlign = "center";
        title.style.margin = "0.5rem 0";
        card.appendChild(title);

        if (isUnavailable) {
            const likeBtn = document.createElement("button");
            likeBtn.textContent = wishlist.includes(item.id) ? "♥" : "♡";
            likeBtn.addEventListener("click", e => {
                e.stopPropagation();
                if (!wishlist.includes(item.id)) wishlist.push(item.id);
                else wishlist = wishlist.filter(id => id !== item.id);
                renderPage();
                assignRowColForNavigation(); 
            });
            card.appendChild(likeBtn);
        }

        if (isAvailable) {
            const duration = document.createElement("p");
            const randomDuration = 80 + Math.floor(Math.random() * 101);
            duration.textContent = `Duration: ${randomDuration} min`;
            duration.style.textAlign = "center";
            duration.style.margin = "0.25rem 0";
            duration.style.fontSize = "0.85rem";
            duration.style.color = "#ccc";
            card.appendChild(duration);
        }

        container.appendChild(card);
    });
}

// ======= Assign Row/Col for Arrow Navigation =======
function assignRowColForNavigation() {
    if (searchBar) {
        searchBar.dataset.row = 0;
        searchBar.dataset.col = 0;
    }

        if (isCategoryPage) {
    categories.forEach((btn, i) => {
        btn.dataset.row = 1;
        btn.dataset.col = i;
    });
    } else {
    categories.forEach((btn, i) => {
        btn.dataset.row = 3;
        btn.dataset.col = i;
    });
    }

    const cardRows = 2;
    let nextRow = isCategoryPage ? 2 : 1;

    function assignCards(container) {
        if (!container) return;
        const cards = Array.from(container.children);
        cards.forEach((card, i) => {
            card.dataset.row = (i % cardRows) + nextRow;
            card.dataset.col = Math.floor(i / cardRows);
        });
        nextRow += cardRows;
    }

    assignCards(containerAvailable);
    assignCards(containerUnavailable);
}

// ======= Render Page =======
function renderPage(filterCategory = null, filterSearch = "") {
    let filtered = contentDB;

    if (filterCategory) filtered = filtered.filter(item => item.category === filterCategory);
    if (filterSearch) filtered = filtered.filter(item => item.name.toLowerCase().includes(filterSearch.toLowerCase()));

    if (isCategoryPage) {
        const available = filtered.filter(item => item.available);
        const unavailable = filtered.filter(item => !item.available);
        renderCards(available, containerAvailable);
        renderCards(unavailable, containerUnavailable);
    } else {
        const available = filtered.filter(item => item.available);
        renderCards(available, containerAvailable);
    }

    assignRowColForNavigation();
}

// ======= Search Functionality =======
if (searchBar) {
    searchBar.addEventListener("input", e => renderPage(null, e.target.value));
}

// ======= Category Clicks =======
categories.forEach(btn => {
    const link = btn.querySelector("a");
    if (!link) return;
    btn.addEventListener("click", () => window.location.href = link.getAttribute("href"));
});

// ======= Arrow Navigation =======
document.addEventListener("keydown", e => {
    const focused = document.activeElement;
    if (!focused.dataset) return;

    const row = parseInt(focused.dataset.row);
    const col = parseInt(focused.dataset.col);
    let next = null;

    function findClosest(targetRow, targetCol) {
        let el = document.querySelector(`[data-row='${targetRow}'][data-col='${targetCol}']`);
        if (el) return el;

        const rowEls = Array.from(document.querySelectorAll(`[data-row='${targetRow}']`));
        if (!rowEls.length) return null;

        let closest = rowEls[0];
        let minDist = Math.abs(parseInt(closest.dataset.col) - targetCol);
        rowEls.forEach(r => {
            const dist = Math.abs(parseInt(r.dataset.col) - targetCol);
            if (dist < minDist) {
                closest = r;
                minDist = dist;
            }
        });
        return closest;
    }

    switch (e.key) {
        case "ArrowUp":
            next = findClosest(row - 1, col);
            break;
        case "ArrowDown":
            next = findClosest(row + 1, col);
            break;
        case "ArrowLeft":
            next = document.querySelector(`[data-row='${row}'][data-col='${col-1}']`) ||
                   findClosest(row, 0);
            break;
        case "ArrowRight":
            next = document.querySelector(`[data-row='${row}'][data-col='${col+1}']`) ||
                   findClosest(row, 0);
            break;
        case "Enter":
            if (typeof focused.click === "function") focused.click();
            break;
    }

    if (next) {
        next.focus();
        e.preventDefault();
    }
});

// ======= Focus First Card =======
window.addEventListener("keydown", e => {
    if (document.activeElement === document.body) {
        const firstCard = document.querySelector(".card");
        if (firstCard) firstCard.focus();
    }
}, { once: true });

// ======= Initialize =======
renderPage();
