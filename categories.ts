import { contentDB, loadContentDB } from "./config";
import {
    assignRowCol,
    menuNavigation,
    findClosest,
    FocusableElement,
} from "./navigation";

const container = document.getElementById("category-container");
const backButton = document.getElementById("back-button");

backButton?.addEventListener("click", () => history.back());

async function initCategories() {
    await loadContentDB();

    const allGenres = Array.from(
        new Set(contentDB.flatMap((item) => item.category || []))
    ).sort();

    allGenres.forEach((genre, index) => {
        const card = document.createElement("div");
        card.className = "smaller-card";
        card.tabIndex = 0;
        card.dataset.row = "1";
        card.dataset.col = `${index}`;
        card.textContent = genre;

        card.addEventListener("click", () => openGenrePage(genre));

        container?.appendChild(card);
    });

    // After cards are added, assign row/col and enable navigation
    assignRowCol();
    menuNavigation();
}

function openGenrePage(genre: string) {
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.body.innerHTML = "";

    // Header with back button
    const header = win.document.createElement("header");
    const backBtn = win.document.createElement("button");
    backBtn.textContent = "⬅ Back";
    backBtn.className = "back-button";
    backBtn.tabIndex = 0;
    backBtn.addEventListener("click", () => win.close());
    header.appendChild(backBtn);

    const h1 = win.document.createElement("h1");
    h1.textContent = genre;
    header.appendChild(h1);
    win.document.body.appendChild(header);

    // Search bar
    const searchContainer = win.document.createElement("div");
    searchContainer.className = "search-container";
    const searchInput = win.document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "search-bar";
    searchInput.placeholder = "Search movies...";
    searchContainer.appendChild(searchInput);
    win.document.body.appendChild(searchContainer);

    // Main container
    const main = win.document.createElement("main");
    main.id = "movie-grid";
    win.document.body.appendChild(main);

    const cardContainer = win.document.createElement("div");
    cardContainer.className = "carousel-wrapper";
    main.appendChild(cardContainer);

    // Filtered content for this genre
    const filtered = contentDB.filter((item) => item.category.includes(genre));

    function renderCards(cards: typeof filtered) {
        cardContainer.innerHTML = "";

        cards.forEach((item, i) => {
            const card = win!.document.createElement("div");
            card.className = "card";
            card.tabIndex = 0;
            card.dataset.row = `${Math.floor(i / 2) + 1}`;
            card.dataset.col = `${i % 2}`;

            const title = win!.document.createElement("h3");
            title.textContent = item.name;
            card.appendChild(title);

            cardContainer.appendChild(card);
        });

        assignRowCol();
    }

    renderCards(filtered);

    const firstCard = findClosest(1, 0, win.document);
    if (firstCard) firstCard.focus();

    searchInput.addEventListener("input", (e: any) => {
        const val = e.target.value.toLowerCase();
        renderCards(
            filtered.filter((item) => item.name.toLowerCase().includes(val))
        );
    });

    menuNavigation();
}

initCategories();
