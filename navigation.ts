import { contentDB, ContentItem } from "./config";

const contentItemCache: Record<string, ContentItem> = {};
contentDB.forEach((item) => (contentItemCache[item.id] = item));

// ======= DOM Elements =======
const containerAvailable =
    document.getElementById("available-cards") ||
    document.getElementById("card-container") ||
    null;
const containerUnavailable = document.getElementById("unavailable-cards");
const searchBar = document.getElementById("search");
const categories = Array.from(
    document.querySelectorAll<HTMLDivElement>(".smaller-card"),
);
const backButton = document.getElementById("back-button");
const movieGrid = document.getElementById("movie-grid");
const previewModal = document.getElementById("preview-modal")!;
const previewName = document.getElementById("preview-name")!;
const previewImage = document.getElementById(
    "preview-image",
) as HTMLImageElement;
const previewDescription = document.getElementById("preview-description")!;
const previewDuration = document.getElementById("preview-duration")!;
const previewSeasonsEpisodes = document.getElementById(
    "preview-seasons-episodes",
)!;
const playButton = document.getElementById("play-button")!;
const closePreviewButton = document.getElementById("close-preview")!;

let lastFocusedElement: FocusableElement | null;
let wishlist: string[] = [];
let modalFocusableCache: FocusableElement[] = [];
let modalActionListenersAdded = false;

export type FocusableElement = HTMLElement;

if (movieGrid) movieGrid.style.height = "auto";

function getContentItemFromCache(id: string): ContentItem | undefined {
    return contentItemCache[id];
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

function getFocusableInModal(): FocusableElement[] {
    if (!previewModal) return [];
    return Array.from(
        previewModal.querySelectorAll<FocusableElement>("button"),
    ).filter((el) => el.offsetParent !== null);
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
    if (!card) return;
    if (card) {
        const imgEl = card.querySelector("img");
        previewImage.src = imgEl
            ? imgEl.src
            : "./content_info/images/default.jpg";
        previewImage.alt = item.name;
    }

    previewName.textContent = item.name;
    previewDescription.textContent = item.description;
    if (item.seasons === null) {
        previewDuration.textContent = `Duration: ${item.duration} min`;
    }
    if (item.seasons !== null) {
        previewSeasonsEpisodes.textContent = `Seasons: ${item.seasons} | Episodes: ${item.episodes}`;
    }
    lastFocusedElement =
        document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
    document.body.classList.add("preview");
    previewModal.classList.add("active");

    const playButton = document.getElementById("play-button")!;
    const wishlistButton = document.getElementById("add-to-wishlist")!;

    if (item.available) {
        wishlistButton.style.display = "none";
        playButton.style.display = "inline-block";
        playButton.focus();
    } else {
        playButton.style.display = "none";
        wishlistButton.style.display = "inline-block";
        wishlistButton.focus();
    }

    (item.available ? playButton : wishlistButton).focus();

    cacheModalFocusables();
    addModalActionListeners();
}

function closePreviewModal() {
    previewModal.classList.remove("active");
    document.body.classList.remove("preview");
    if (lastFocusedElement) lastFocusedElement.focus();
}

function renderPage(
    filterCategory: ContentItem["category"] | null = null,
    filterSearch = "",
) {
    let filtered = contentDB;

    if (filterCategory && filterCategory.length > 0) {
        filtered = filtered.filter((item) =>
            item.category.some((cat) => filterCategory.includes(cat)),
        );
    }

    if (filterSearch) {
        filtered = filtered.filter((item) =>
            item.name.toLowerCase().includes(filterSearch.toLowerCase()),
        );
    }

    const available = filtered.filter((item) => item.available);
    const unavailable = filtered.filter((item) => !item.available);

    function contentAvailability() {
        if (containerAvailable && containerUnavailable) {
            renderCards(available, containerAvailable);
            renderCards(unavailable, containerUnavailable);
        } else {
            if (containerAvailable) {
                renderCards(available, containerAvailable);
            }
        }
    }

    assignRowCol();
    contentAvailability();
}

export function renderCards(
    cards: ContentItem[],
    container: HTMLElement,
): void {
    if (!container) return;
    container.innerHTML = "";
    
    const isUnavailable = container.id === 'unavailable-cards';
    const isAvailable = container.id === 'available-cards';

    cards.forEach((item) => {
        const card = document.createElement("div");
        card.className = "card";
        card.tabIndex = 0;
        card.dataset.id = item.id;

        card.addEventListener("click", (e) => {
            console.log("ITEM DATA:", item); // DEBUG TEMP FUCK YOU
            openPreviewModal(item);
            e.stopPropagation();
        });

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
            likeBtn.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.stopPropagation();
                    if (!wishlist.includes(item.id)) wishlist.push(item.id);
                    else wishlist = wishlist.filter((id) => id !== item.id);
                    renderPage();
                    assignRowCol();
                }
            });
        }

        if (isAvailable) {
            const info = document.createElement("p");
            info.style.textAlign = "center";
            info.style.margin = "0.25rem 0";
            info.style.fontSize = "0.85rem";
            info.style.color = "#ccc";

            if (item.seasons === null) {
                info.textContent = `Duration: ${item.duration} min`;
            } else {
                info.textContent = `Seasons: ${item.seasons} | Episodes: ${item.episodes}`;
            }

            card.appendChild(info);
        }

        container.appendChild(card);
    });
}

export function assignRowCol() {
    if (searchBar) {
        searchBar.dataset.row = "0";
        searchBar.dataset.col = "0";
    }

    if (backButton && searchBar) {
        backButton.dataset.row = "0";
        backButton.dataset.col = "0";
        searchBar.dataset.col = "1";
    }

    const cardRows: number = 2;
    let nextRow: number = 1;

    function assignCards(container: HTMLElement | null): void {
        if (container === null) return;

        const cards = Array.from(container.children).filter(
            (el): el is HTMLDivElement => el.tagName === "DIV",
        ); // Make sure all cards are div

        cards.forEach((card, i) => {
            card.dataset.row = `${(i % cardRows) + nextRow}`;
            card.dataset.col = `${Math.floor(i / cardRows)}`;
        });

        nextRow += cardRows;
    }

    assignCards(containerAvailable);
    assignCards(containerUnavailable);

    categories.forEach((btn, i) => {
        btn.dataset.row = `${nextRow}`;
        btn.dataset.col = `${i}`;
    });
}

export function findClosest(
    targetRow: number,
    targetCol: number,
    root: Document | HTMLElement = document,
): FocusableElement | null {
    let el = root.querySelector<FocusableElement>(
        `[data-row='${targetRow}'][data-col='${targetCol}']`,
    );
    if (el) return el;

    const rowEls = Array.from(
        root.querySelectorAll<FocusableElement>(`[data-row='${targetRow}']`),
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

export function menuNavigation(): void {
    function getFocused(): FocusableElement | null {
        const el = document.activeElement;
        return el instanceof HTMLElement ? el : null;
    }

    document.addEventListener("keydown", (e) => {
        const focused = getFocused();
        if (!focused) return;

        if (focused === searchBar) {
            searchBar.setAttribute("autocomplete", "off");
            if (e.key === "Escape") {
                searchBar.blur();
                e.preventDefault();
            }
            if (e.key === "ArrowDown") {
                searchBar.blur();
                e.preventDefault();
            }
            return;
        }

        if (previewModal && previewModal.classList.contains("active")) {
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
                        `[data-row='${row}'][data-col='${col - 1}']`,
                    ) || findClosest(row, 0);
                break;
            case "ArrowRight":
                next =
                    document.querySelector<FocusableElement>(
                        `[data-row='${row}'][data-col='${col + 1}']`,
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

window.addEventListener("keydown", (e) => {
    if (document.activeElement === document.body) {
        const firstFocusable = Array.from(
            document.querySelectorAll<FocusableElement>('[tabindex="0"]'),
        ).find((el) => el.id !== "search");
        if (firstFocusable) firstFocusable.focus();
    }
    e.stopPropagation();
});

closePreviewButton?.addEventListener("click", () => {
    closePreviewModal();
});

playButton?.addEventListener("click", () => {
    if (!lastFocusedElement) return;
    const itemName = previewName.textContent;
    if (!itemName) return;

    const slug = encodeURIComponent(itemName);
    window.location.href = `mediaplayer.html?slug=${slug}`;
});

function init() {
    const params = new URLSearchParams(window.location.search);
    const genre = params.get("genre");

    //temporary placeholder to simulate availabilty
    contentDB.forEach((item) => {
        item.available = Math.random() > 0.3;
    });

    contentDB.forEach((item) => {
        contentItemCache[item.id] = item;
    });

    if (genre) {
        renderPage([decodeURIComponent(genre)]);
    } else {
        renderPage();
    }
    assignRowCol();
    search();
    menuNavigation();
}

export default {
    renderCards,
    assignRowCol,
    menuNavigation,
    search,
    openPreviewModal,
    closePreviewModal,
    findClosest,
    getFocusableInModal,
    addModalActionListeners,
    renderPage,
    init,
};
