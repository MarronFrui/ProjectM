import { contentDB, loadContentDB } from "./config.js";

const container = document.getElementById("category-container");
const backButton = document.getElementById("back-button");

backButton?.addEventListener("click", () => history.back());

async function initCategories() {
    await loadContentDB();

    const allGenres = Array.from(
        new Set(contentDB.flatMap(item => item.category || []))
    ).sort();

    allGenres.forEach(genre => {
        const card = document.createElement("div");
        card.className = "smaller-card";
        card.tabIndex = 0;
        card.textContent = genre;

        card.addEventListener("click", () => openGenrePage(genre));

        container?.appendChild(card);
    });
}

function openGenrePage(genre: string) {
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.body.innerHTML = "";

    const header = win.document.createElement("header");
    const backBtn = win.document.createElement("button");
    backBtn.textContent = "⬅ Back";
    backBtn.className = "search-bar";
    backBtn.addEventListener("click", () => win.close());
    header.appendChild(backBtn);

    const h1 = win.document.createElement("h1");
    h1.textContent = genre;
    header.appendChild(h1);
    win.document.body.appendChild(header);

    const searchContainer = win.document.createElement("div");
    searchContainer.className = "search-container";
    const searchInput = win.document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "search-bar";
    searchInput.placeholder = "Search movies...";
    searchContainer.appendChild(searchInput);
    win.document.body.appendChild(searchContainer);

    const main = win.document.createElement("main");
    main.id = "movie-grid";
    win.document.body.appendChild(main);

    const cardContainer = win.document.createElement("div");
    cardContainer.className = "carousel-wrapper";
    main.appendChild(cardContainer);

    const filtered = contentDB.filter(item => item.category.includes(genre));

    function renderCards(cards: typeof filtered) {
        cardContainer.innerHTML = "";
        cards.forEach(item => {
            const card = win!.document.createElement("div");
            card.className = "card";

            const title = win!.document.createElement("h3");
            title.textContent = item.name;
            card.appendChild(title);

            cardContainer.appendChild(card);
        });
    }

    renderCards(filtered);

    searchInput.addEventListener("input", (e: any) => {
        const val = e.target.value.toLowerCase();
        renderCards(filtered.filter(item => item.name.toLowerCase().includes(val)));
    });
}

initCategories();
