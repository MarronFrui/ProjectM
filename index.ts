// ======= Content Dataset =======
const contentDB = new Array(200).fill(null).map((_, i) => ({
    id: `item-${i+1}`,
    name: `title ${i}`,
    description: `Description of title ${i}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
    category: ["Film", "Serie", "Documentaire"][i % 3],
    available: Math.random() > 0.5,
    duration: 80 + Math.floor(Math.random() * 101),
    seasons: i % 3 === 1 ? 1 + Math.floor(Math.random() * 5) : null, // only for series
    episodes: i % 3 === 1 ? 6 + Math.floor(Math.random() * 15) : null
}));

// ======= DOM Elements =======
const containerAvailable = document.getElementById("available-cards") || document.getElementById("card-container");
const containerUnavailable = document.getElementById("unavailable-cards");
const searchBar = document.getElementById("search");
const categories = Array.from(
    document.querySelectorAll<HTMLDivElement>(".smaller-card")
);
const isCategoryPage = !!document.querySelector(".disponibility-container");
const movieGrid = document.getElementById("movie-grid");
const previewModal = document.getElementById("preview-modal");
const previewName = document.getElementById("preview-name");
const previewDescription = document.getElementById("preview-description");
const previewDuration = document.getElementById("preview-duration");
const previewSeasonsEpisodes = document.getElementById("preview-seasons-episodes");
const playButton = document.getElementById("play-button");
const closePreview = document.getElementById("close-preview");
const previewImage = document.getElementById("preview-image");

export interface ContentItem {
    id: string;
    name: string;
    description: string;
    category: "Film" | "Serie" | "Documentaire";
    available: boolean;
    duration: number;
    seasons: number | null;
    episodes: number | null;
}

let wishlist: string[] = [];

if (isCategoryPage && movieGrid) movieGrid.style.height = "auto";

// ======= Render Cards =======
function renderCards(cards: ContentItem[], container: HTMLElement): void {
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
                assignRowCol(); 
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
function assignRowCol() {
    if (searchBar) {
        searchBar.dataset.row = "0";
        searchBar.dataset.col = "0";
    }

        if (isCategoryPage) {
    categories.forEach((btn, i) => {
        btn.dataset.row = "1";
        btn.dataset.col = `${i}`;
    });
    } else {
    categories.forEach((btn, i) => {
        btn.dataset.row = "3";
        btn.dataset.col = `${i}`;
    });
    }

    const cardRows: number = 2;
    let nextRow: number = isCategoryPage ? 2 : 1;

    function assignCards(container: HTMLElement): void {
        if (typeof container === null) {
            return
        } 

        const cards = Array.from(container.children).filter((el): el is HTMLDivElement => el.tagName === "DIV"); // Make sure all cards are div

        cards.forEach((card, i) => {
            card.dataset.row = `${(i % cardRows) + nextRow}`;
            card.dataset.col = `${Math.floor(i / cardRows)}`;
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

    assignRowCol();
}

let lastFocusedElement = null;

// ======= Preview Modal =======
function openPreview(item) {
    const card = document.querySelector(`.card[data-id='${item.id}']`);
    if (card) {
        const imgEl = card.querySelector("img");
        previewImage.src = imgEl ? imgEl.src : './content_info/images/default.jpg';
        previewImage.alt = item.name;
    }

    previewName.textContent = item.name;
    previewDescription.textContent = item.description;
    previewDuration.textContent = `Duration: ${item.duration} min`;
    
    if (item.category === "Serie") {
        previewSeasonsEpisodes.textContent = `Seasons: ${item.seasons}, Episodes: ${item.episodes}`;
    } else {
        previewSeasonsEpisodes.textContent = "";
    }

    lastFocusedElement = document.activeElement; // save focus
    document.body.classList.add("preview"); // lock scroll & interactions
    previewModal.classList.add("active");
    playButton.focus();
}

// ======= 5. Close modal button =======
function closePreviewModal() {
    previewModal.classList.remove("active");
    document.body.classList.remove("preview"); // restore interaction
    if (lastFocusedElement) lastFocusedElement.focus(); // restore previous focus
}


document.addEventListener("keydown", e => {
    if (e.key === "Escape" || e.key === "Backspace") {
        closePreviewModal();
    }
});


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

document.addEventListener("keydown", e => {
    if (document.body.classList.contains("preview")) return; // skip background navigation

    const focused = document.activeElement;
    if (!focused.dataset) return;
    
    if (e.key === "Enter") {
        const focused = document.activeElement;
        if (focused && focused.classList.contains("card")) {
            const itemId = focused.dataset.id;
            const item = contentDB.find(i => i.id === itemId);
            if (item) openPreview(item);
        }
    }
});

document.addEventListener("click", e => {
        const focused = document.activeElement;
        if (focused && focused.classList.contains("card")) {
            const itemId = focused.dataset.id;
            const item = contentDB.find(i => i.id === itemId);
            if (item) openPreview(item);
        }

});

previewModal.addEventListener("keydown", e => {
    const focusable = Array.from(previewModal.querySelectorAll("button, [tabindex]:not([tabindex='-1'])"));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const focusedIndex = focusable.indexOf(document.activeElement);

    switch (e.key) {
        case "Tab":
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
            break;

        case "ArrowUp":
            e.preventDefault();
            if (focusedIndex > 0) focusable[focusedIndex - 1].focus();
            break;
        case "ArrowDown":
            e.preventDefault();
            if (focusedIndex < focusable.length - 1) focusable[focusedIndex + 1].focus();
            break;

        case "Enter":
        case " ":
            if (document.activeElement.tagName === "BUTTON") {
                e.preventDefault(); // prevent Space scrolling
                document.activeElement.click(); // triggers click on closePreview or any other button
            }
            break;

        case "Escape":
        case "Backspace":
            closePreviewModal();
            break;
    }
});


playButton.addEventListener("click", () => {
    const focused = document.activeElement;
    if (focused && focused.classList.contains("card")) {
        const itemId = focused.dataset.id;
        const item = contentDB.find(i => i.id === itemId);
        if (item) {
            // Encode the title to make it URL-safe
            const titleSlug = encodeURIComponent(item.name.replace(/\s+/g, '-'));
            window.location.href = `http://127.0.0.1:5173/${titleSlug}`;
        }
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
