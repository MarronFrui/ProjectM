// ======= Content Dataset =======
const contentDB = new Array(50).fill(null).map((_, i) => ({
    id: `item-${i+1}`,
    name: "Unknown",
    category: ["Film", "Serie", "Documentaire"][i % 3],
    available: true | false
}));

// Wishlist stores only IDs
let wishlist = [];

// ======= DOM Elements =======
const containerAvailable = document.getElementById("available-cards") || document.getElementById("card-container");
const containerUnavailable = document.getElementById("unavailable-cards");
const searchBar = document.getElementById("search");
const categories = Array.from(document.querySelectorAll(".smaller-card"));
const isCategoryPage = !!document.querySelector(".disponibility-container");
const movieGrid = document.getElementById("movie-grid");

if (isCategoryPage && movieGrid) {
    movieGrid.style.height = "auto";    
}

// ======= Render Grid =======
function renderCards(cards, container) {
    if (!container) return;
    container.innerHTML = "";

    cards.forEach((item, i) => {
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

        // Wishlist button
        const likeBtn = document.createElement("button");
        likeBtn.textContent = wishlist.includes(item.id) ? "♥" : "♡";
        likeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!wishlist.includes(item.id)) wishlist.push(item.id);
            else wishlist = wishlist.filter(id => id !== item.id);
            renderPage(); // re-render
        });
        card.appendChild(likeBtn);

        container.appendChild(card);
    });

    assignRowCol(container);
}

// ======= Assign Row/Col for Arrow Navigation =======
function assignRowCol(container) {
    if (!container) return;
    const cards = Array.from(container.children);
    const rows = 2;


    cards.forEach((card, i) => {
        card.dataset.row = i % rows + 1;         // row 1 or 2
        card.dataset.col = Math.floor(i / rows); // column index
    });
}

// ======= Render Page =======
function renderPage(filterCategory = null, filterSearch = "") {
    let filtered = contentDB;

    // Filter category
    if (filterCategory) filtered = filtered.filter(item => item.category === filterCategory);

    // Filter search
    if (filterSearch) filtered = filtered.filter(item => item.name.toLowerCase().includes(filterSearch.toLowerCase()));

    // Available / Unavailable
    const available = filtered.filter(item => item.available);
    const unavailable = filtered.filter(item => !item.available);

    // Render
    renderCards(available, containerAvailable);
    renderCards(unavailable, containerUnavailable);
}

// ======= Search Functionality =======
if (searchBar) {
    searchBar.addEventListener("input", (e) => {
        renderPage(null, e.target.value);
    });
}

// ======= Category Clicks =======
categories.forEach(btn => {
    const link = btn.querySelector("a");
    if (!link) return;
    btn.addEventListener("click", () => {
        window.location.href = link.getAttribute("href");
    });
});

// ======= Arrow Navigation =======
function setupArrowNavigation() {
    const allFocusable = [searchBar, ...Array.from(document.querySelectorAll(".card")), ...categories].filter(Boolean);
    allFocusable.forEach((el, i) => {
        if (!el.dataset) el.dataset = {};
    });

    searchBar.dataset.row = 0;
    searchBar.dataset.col = 0;
    const rows = 2;

    document.querySelectorAll(".card").forEach((card, i) => {
        card.dataset.row = i % rows + 1;
        card.dataset.col = Math.floor(i / rows);
    });

    categories.forEach((btn, i) => {
        btn.dataset.row = 3;
        btn.dataset.col = i;
    });
        
    if (isCategoryPage) {
    // Flatten available + unavailable cards
    const allCards = Array.from(document.querySelectorAll(".card-container .card"));

    allCards.forEach((card, i) => {
        card.dataset.row = (i % rows) + 1;            // 1 or 2
        card.dataset.col = Math.floor(i / rows);      // column index
    });

    // Assign categories row after cards
    categories.forEach((btn, i) => {
        btn.dataset.row = 3;
        btn.dataset.col = i;
    });

    if (searchBar) {
        searchBar.dataset.row = 0;
        searchBar.dataset.col = 0;
    }
}

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
        case "Enter": // OK button on remote
            if (focused && typeof focused.click === "function") {
                focused.click(); // trigger click of the focused element
            }
            break;
    }

    if(next) {
        next.focus();
        e.preventDefault();
    }
});

    // Focus first card if nothing focused
    window.addEventListener("keydown", (e) => {
        if (document.activeElement === document.body) {
            const firstCard = document.querySelector(".card");
            if (firstCard) firstCard.focus();
        }
    }, { once: true });
}

// ======= Initialize =======
renderPage();
setupArrowNavigation();
assignRowCol(containerAvailable)
assignRowCol(containerUnavailable)