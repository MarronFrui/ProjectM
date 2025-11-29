import { loadContentDB, contentDB, ContentItem } from "./config";

const contentItemCache: Record<string, ContentItem> = {};
contentDB.forEach((item) => (contentItemCache[item.id] = item));

// ======= DOM Elements =======
const containerAvailable =
    document.getElementById("available-cards") ||
    document.getElementById("card-container");
const containerUnavailable = document.getElementById("unavailable-cards");
const searchBar = document.getElementById("search");
const categories = Array.from(
    document.querySelectorAll<HTMLDivElement>(".smaller-card")
);
const isCategoryPage = !!document.querySelector(".disponibility-container");
const movieGrid = document.getElementById("movie-grid");
const previewModal = document.getElementById("preview-modal")!;
const previewName = document.getElementById("preview-name")!;
const previewImage = document.getElementById(
    "preview-image"
) as HTMLImageElement;
const previewDescription = document.getElementById("preview-description")!;
const previewDuration = document.getElementById("preview-duration")!;
const previewSeasonsEpisodes = document.getElementById(
    "preview-seasons-episodes"
)!;
const playButton = document.getElementById("play-button")!;
const closePreviewButton = document.getElementById("close-preview")!;

let lastFocusedElement: FocusableElement | null;

type FocusableElement = HTMLElement;

let wishlist: string[] = [];

if (isCategoryPage && movieGrid) movieGrid.style.height = "auto";

function renderCards(cards: ContentItem[], container: HTMLElement): void {
    if (!container) return;
    container.innerHTML = "";

    const isUnavailable = container === containerUnavailable;
    const isAvailable = container === containerAvailable;

    cards.forEach((item) => {
        const card = document.createElement("div");
        card.className = "card";
        card.tabIndex = 0;
        card.dataset.id = item.id;

        const img = document.createElement("img");
        img.src = item.poster ?? "./content-info/poster/default.jpg";
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

        card.addEventListener("click", () => {
            openPreviewModal(item);
        });

        if (isUnavailable) {
            const likeBtn = document.createElement("button");
            likeBtn.textContent = wishlist.includes(item.id) ? "♥" : "♡";
            likeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (!wishlist.includes(item.id)) wishlist.push(item.id);
                else wishlist = wishlist.filter((id) => id !== item.id);
                renderPage();
                assignRowCol();
            });
            card.appendChild(likeBtn);
        }

        if (isAvailable) {
            const duration = document.createElement("p");
            duration.textContent = `Duration: ${item.duration ?? "??"} min`;
            duration.style.textAlign = "center";
            duration.style.margin = "0.25rem 0";
            duration.style.fontSize = "0.85rem";
            duration.style.color = "#ccc";
            card.appendChild(duration);
        }

        container.appendChild(card);
    });
}

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

        const cards = Array.from(container.children).filter(
            (el): el is HTMLDivElement => el.tagName === "DIV"
        ); // Make sure all cards are div

        cards.forEach((card, i) => {
            card.dataset.row = `${(i % cardRows) + nextRow}`;
            card.dataset.col = `${Math.floor(i / cardRows)}`;
        });

        nextRow += cardRows;
    }

    assignCards(containerAvailable);
    assignCards(containerUnavailable);
}

function renderPage(
    filterCategory: ContentItem["category"] | null = null,
    filterSearch = ""
) {
    let filtered = contentDB;

    if (filterCategory && filterCategory.length > 0) {
    filtered = filtered.filter((item) =>
        item.category.some((cat) => filterCategory.includes(cat))
    );
}

    if (filterSearch) {
        filtered = filtered.filter((item) =>
            item.name.toLowerCase().includes(filterSearch.toLowerCase())
        );
    }

    const available = filtered.filter((item) => item.available);
    const unavailable = filtered.filter((item) => !item.available);

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

function search(): void {
    if (!searchBar) {
        return;
    }
    searchBar.addEventListener("input", (e) => {
        if (e.target instanceof HTMLInputElement) {
            renderPage(null, e.target.value);
        }
    });
}

function getContentItemFromCache(id: string): ContentItem | undefined {
    return contentItemCache[id];
}

let modalFocusableCache: FocusableElement[] = [];
let modalActionListenersAdded = false;

function getFocusableInModal(): FocusableElement[] {
    if (!previewModal) return [];
    return Array.from(
        previewModal.querySelectorAll<FocusableElement>(
            "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        )
    ).filter((el) => !el.hasAttribute("disabled"));
}

function cacheModalFocusables() {
    modalFocusableCache = getFocusableInModal();
}

function addModalActionListeners() {
    if (modalActionListenersAdded) return;
    modalActionListenersAdded = true;

    closePreviewButton.addEventListener("click", () => closePreviewModal());
    playButton.addEventListener("click", () => {
        if (!lastFocusedElement) return;
        const slug = encodeURIComponent(previewName.textContent!);
        window.location.href = `mediaplayer.html?slug=${slug}`;
    });
}

function openPreviewModal(item: ContentItem) {
    const card = document.querySelector(`.card[data-id='${item.id}']`);
    if (card) {
        const imgEl = card.querySelector("img");
        previewImage.src = imgEl
            ? imgEl.src
            : "./content_info/images/default.jpg";
        previewImage.alt = item.name;
    }

    previewName.textContent = item.name;
    previewDescription.textContent = item.description;
    previewDuration.textContent = `Duration: ${item.duration} min`;
    previewSeasonsEpisodes.textContent =
    item.category.includes("Serie")
        ? `Seasons: ${item.seasons}, Episodes: ${item.episodes}`
        : "";

    lastFocusedElement =
        document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
    document.body.classList.add("preview");
    previewModal.classList.add("active");
    playButton.focus();

    cacheModalFocusables();
    addModalActionListeners();
}

function findClosest(
    targetRow: number,
    targetCol: number
): FocusableElement | null {
    let el = document.querySelector<FocusableElement>(
        `[data-row='${targetRow}'][data-col='${targetCol}']`
    );
    if (el) return el;

    const rowEls = Array.from(
        document.querySelectorAll<FocusableElement>(`[data-row='${targetRow}']`)
    );
    if (!rowEls.length) return null;

    let closest: FocusableElement = rowEls[0];
    let minDist = Number.MAX_SAFE_INTEGER;

    rowEls.forEach((r) => {
        const dist = Math.abs(parseInt(r.dataset.col ?? "0") - targetCol);
        if (dist < minDist) {
            closest = r;
            minDist = dist;
        }
    });

    return closest;
}

export function navigation(): void {
    function getFocused(): FocusableElement | null {
        const el = document.activeElement;
        return el instanceof HTMLElement ? el : null;
    }

    document.addEventListener("keydown", (e) => {
        const focused = getFocused();
        if (!focused) return;

        if (previewModal.classList.contains("active")) {
            const currentIndex = modalFocusableCache.indexOf(focused);
            let nextIndex = currentIndex;

            switch (e.key) {
                case "ArrowRight":
                case "ArrowDown":
                    nextIndex = (currentIndex + 1) % modalFocusableCache.length;
                    break;
                case "ArrowLeft":
                case "ArrowUp":
                    nextIndex =
                        (currentIndex - 1 + modalFocusableCache.length) %
                        modalFocusableCache.length;
                    break;
                case "Enter":
                case "OK":
                    focused.click();
                    break;
                case "Escape":
                case "Back":
                    closePreviewModal();
                    break;
                default:
                    return;
            }

            e.preventDefault();
            modalFocusableCache[nextIndex].focus();
            return;
        }

        const row = parseInt(focused.dataset.row!);
        const col = parseInt(focused.dataset.col!);
        let next: FocusableElement | null = null;

        findClosest(row, col);

        switch (e.key) {
            case "ArrowUp":
                next = findClosest(row - 1, col);
                break;
            case "ArrowDown":
                next = findClosest(row + 1, col);
                break;
            case "ArrowLeft":
                next =
                    document.querySelector<FocusableElement>(
                        `[data-row='${row}'][data-col='${col - 1}']`
                    ) || findClosest(row, 0);
                break;
            case "ArrowRight":
                next =
                    document.querySelector<FocusableElement>(
                        `[data-row='${row}'][data-col='${col + 1}']`
                    ) || findClosest(row, 0);
                break;
            case "Enter":
                if (focused.classList.contains("card")) {
                    const itemId = focused.dataset.id!;
                    const item = getContentItemFromCache(itemId);
                    if (item) openPreviewModal(item);
                } else if (focused.classList.contains("smaller-card")) {
                    const link = focused.querySelector<HTMLAnchorElement>("a");
                    if (link) link.click();
                }
                e.preventDefault();
                break;
            case "Escape":
            case "Backquote":
                closePreviewModal();
                break;
        }

        if (next) {
            e.preventDefault();
            next.focus();
        }
    });
}

function closePreviewModal() {
    previewModal.classList.remove("active");
    document.body.classList.remove("preview");
    if (lastFocusedElement) lastFocusedElement.focus();
}

window.addEventListener(
    "keydown",
    (e) => {
        if (document.activeElement === document.body) {
            const firstFocusable = Array.from(
                document.querySelectorAll<FocusableElement>('[tabindex="0"]')
            ).find((el) => el.id !== "search");
            if (firstFocusable) firstFocusable.focus();
        }
    },
    { once: true }
);

closePreviewButton.addEventListener("click", () => {
    closePreviewModal();
});

playButton.addEventListener("click", () => {
    if (!lastFocusedElement) return;
    const itemName = previewName.textContent;
    if (!itemName) return;

    const slug = encodeURIComponent(itemName);
    window.location.href = `mediaplayer.html?slug=${slug}`;
});

async function init() {
    try {
        await loadContentDB();
        Object.assign(contentItemCache, Object.fromEntries(contentDB.map((i) => [i.id, i])));
        assignRowCol();
        renderPage();
        search();
        navigation();
    } catch (err) {
        console.error("Failed to initialize:", err);
    }
}

init();
