// ======= Content Dataset =======
const contentDB: ContentItem[] = new Array(200).fill(null).map((_, i): ContentItem => ({
    id: `item-${i+1}`,
    name: `title ${i}`,
    description: `Description of title ${i}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
    category: ["Film", "Serie", "Documentaire"][i % 3] as ContentItem["category"],
    available: Math.random() > 0.5,
    duration: 80 + Math.floor(Math.random() * 101),
    seasons: i % 3 === 1 ? 1 + Math.floor(Math.random() * 5) : null,
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
const previewModal = document.getElementById("preview-modal")!;
const previewName = document.getElementById("preview-name")!;
const previewImage = document.getElementById("preview-image") as HTMLImageElement;
const previewDescription = document.getElementById("preview-description")!;
const previewDuration = document.getElementById("preview-duration")!;
const previewSeasonsEpisodes = document.getElementById("preview-seasons-episodes")!;
const playButton = document.getElementById("play-button")!;
const closePreview = document.getElementById("close-preview")!;


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

type FocusableElement = HTMLElement;

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

    function assignCards(container: HTMLElement | null): void {
        if (container === null) return;
        
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
function renderPage(filterCategory: ContentItem["category"] | null = null, filterSearch = "") {
    let filtered = contentDB;

    if (filterCategory) {
        filtered = filtered.filter(item => item.category === filterCategory);
    }

    if (filterSearch) {
        filtered = filtered.filter(item =>
            item.name.toLowerCase().includes(filterSearch.toLowerCase())
        );
    }

    const available = filtered.filter(item => item.available);
    const unavailable = filtered.filter(item => !item.available);

if (isCategoryPage) {
    if (containerAvailable && containerUnavailable) {
        renderCards(available, containerAvailable);
        renderCards(unavailable, containerUnavailable);
    }
} else {
    if (containerAvailable) {
        renderCards(available, containerAvailable);
    }
}


    assignRowCol();
}


let lastFocusedElement: any = null;

// ======= Preview Modal =======
function openPreview(item: ContentItem) {
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
function search(): void {
    if (!searchBar){
        return
    }
    searchBar.addEventListener("input", e => {
        if (e.target instanceof HTMLInputElement) {
            renderPage(null, e.target.value);
        }
    });

}


// ======= Arrow Navigation =======
function navigation(): void {

    function getFocused(): FocusableElement | null {
        const el = document.activeElement;
        return el instanceof HTMLElement ? el : null;
    }

    document.addEventListener("keydown", e => {
        const focused: FocusableElement | null = getFocused();
        if (!focused) return;
        if (!focused.dataset.row || !focused.dataset.col) return;

        const row = parseInt(focused.dataset.row);
        const col = parseInt(focused.dataset.col);
        let next: FocusableElement | null = null;

        function findClosest(targetRow: number, targetCol: number): FocusableElement | null {
            let el = document.querySelector<FocusableElement>(`[data-row='${targetRow}'][data-col='${targetCol}']`);
            if (el) return el;

            const rowEls = Array.from(document.querySelectorAll<FocusableElement>(`[data-row='${targetRow}']`));
            if (!rowEls.length) return null;

            let closest: FocusableElement = rowEls[0];
            let minDist: number = Number.MAX_SAFE_INTEGER;

            rowEls.forEach(r => {
                const dist = Math.abs(parseInt(r.dataset.col ?? "0") - targetCol);
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
                next = document.querySelector<FocusableElement>(`[data-row='${row}'][data-col='${col - 1}']`) ||
                       findClosest(row, 0);
                break;
            case "ArrowRight":
                next = document.querySelector<FocusableElement>(`[data-row='${row}'][data-col='${col + 1}']`) ||
                       findClosest(row, 0);
                break;
            case "Enter":
                if (typeof focused.click === "function") focused.click();
                break;
        }

        if (next) {
            e.preventDefault();
            next.focus();
        }
    });


}


// ======= Focus First Card =======
window.addEventListener("keydown", e => {
    if (document.activeElement === document.body) {
        const firstCard = document.querySelector<FocusableElement>(".card");
        if (firstCard) firstCard.focus();
    }
}, { once: true });

// ======= Initialize =======
function init() {
    assignRowCol();
    renderPage();
    search(); 
    navigation();
}

init()
