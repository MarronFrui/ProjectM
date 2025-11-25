import {contentDB, ContentItem } from "./config.ts";

const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");
if (!slug) throw new Error("No slug provided");

const item = contentDB.find(x => x.name === slug);
if (!item) throw new Error(`Media item not found: ${slug}`);
  
export class MediaPlayer {
    private videoElement: HTMLVideoElement;
    private titleElement: HTMLElement;
    private episodeSelector?: HTMLElement;
    private seasonSelector?: HTMLElement;

    constructor(
        videoElement: HTMLVideoElement,
        titleElement: HTMLElement,
        episodeSelector?: HTMLElement,
        seasonSelector?: HTMLElement
    ) {
        this.videoElement = videoElement;
        this.titleElement = titleElement;
        this.episodeSelector = episodeSelector;
        this.seasonSelector = seasonSelector;
    }

    loadMedia(item: ContentItem) {
    this.titleElement.textContent = item.name;

    if (item.filePath) {
        this.videoElement.src = item.filePath;
        this.videoElement.load();
        this.videoElement.play();
    } else {
        console.warn(`No file path for ${item.name}`);
        this.videoElement.removeAttribute("src"); // clear player
    }

    if (item.category === "Serie" && this.episodeSelector && this.seasonSelector) {
        this.populateEpisodes(item);
        this.populateSeasons(item);
    }
}

    private populateEpisodes(item: ContentItem) {
        if (!this.episodeSelector || !item.episodes) return;

        this.episodeSelector.innerHTML = "";
        for (let i = 1; i <= item.episodes; i++) {
            const btn = document.createElement("button");
            btn.textContent = `Episode ${i}`;
            btn.addEventListener("click", () => this.loadEpisode(item, i));
            this.episodeSelector.appendChild(btn);
        }
    }

    private populateSeasons(item: ContentItem) {
        if (!this.seasonSelector || !item.seasons) return;

        this.seasonSelector.innerHTML = "";
        for (let i = 1; i <= item.seasons; i++) {
            const btn = document.createElement("button");
            btn.textContent = `Season ${i}`;
            btn.addEventListener("click", () => this.switchSeason(item, i));
            this.seasonSelector.appendChild(btn);
        }
    }

    private loadEpisode(item: ContentItem, episodeNumber: number) {
        console.log(`Loading ${item.name} - Episode ${episodeNumber}`);
        this.videoElement.play();
    }

    private switchSeason(item: ContentItem, seasonNumber: number) {
        console.log(`Switching ${item.name} to Season ${seasonNumber}`);
        this.populateEpisodes(item);
    }
}

