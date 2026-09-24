const widgetContainer = document.getElementById("lastfm-widget");

async function fetchSong(username) {
    const apiUrl = `https://lastfm-last-played.biancarosa.com.br/${username}/latest-song`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
        throw new Error(`Failed to fetch last played song (${response.status})`);
    }

    const data = await response.json();
    const track = data.track;

    const getImage = (size) => {
        const img = (track.image || []).find((img) => img.size === size);
        return img ? img["#text"] : "";
    };

    return {
        name: track.name,
        album: track.album ? track.album["#text"] : "",
        artist: track.artist ? track.artist["#text"] : "",

        image: {
            small: getImage("small"),
            medium: getImage("medium"),
            large: getImage("extralarge"),
            extralarge: getImage("mega")
        },

        cover: getImage("extralarge") || getImage("medium") || getImage("small"),
        url: track.url,
        nowPlaying: track["@attr"] ? track["@attr"].nowplaying === "true" : false
    };
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderLoading() {
    widgetContainer.classList.add("lastfm-widget--loading");
    widgetContainer.innerHTML = `
        <div class="lastfm-widget__cover"></div>
        <div class="lastfm-widget__body">
            <div class="lastfm-widget__skeleton lastfm-widget__skeleton--sm"></div>
            <div class="lastfm-widget__skeleton lastfm-widget__skeleton--md"></div>
            <div class="lastfm-widget__skeleton lastfm-widget__skeleton--sm"></div>
        </div>
    `;
}

function renderError(message) {
    widgetContainer.classList.remove("lastfm-widget--loading");
    widgetContainer.classList.add("lastfm-widget--error");
    widgetContainer.style.removeProperty("--lastfm-cover");
    widgetContainer.textContent = message || "Couldn't load track.";
}

function renderSong(song) {
    widgetContainer.classList.remove("lastfm-widget--loading", "lastfm-widget--error");

    // Feeds the "bg" and "banner" themes, which use the cover as the background.
    if (song.cover) {
        widgetContainer.style.setProperty("--lastfm-cover", `url("${song.cover.replace(/["\\]/g, "")}")`);
    } else {
        widgetContainer.style.removeProperty("--lastfm-cover");
    }

    const cover = song.cover
        ? `<img class="lastfm-widget__cover" src="${escapeHtml(song.cover)}" alt="${escapeHtml(song.album || song.name)} cover" loading="lazy">`
        : `<div class="lastfm-widget__cover lastfm-widget__cover--placeholder">♪</div>`;

    const status = song.nowPlaying
        ? `<span class="lastfm-widget__status lastfm-widget__status--live">
               <span class="lastfm-widget__eq"><span></span><span></span><span></span></span>
               Now playing
           </span>`
        : `<span class="lastfm-widget__status">Last played</span>`;

    const album = song.album
        ? `<p class="lastfm-widget__meta">from <b>${escapeHtml(song.album)}</b></p>`
        : "";

    widgetContainer.innerHTML = `
        ${cover}
        <div class="lastfm-widget__body">
            ${status}
            <h2 class="lastfm-widget__title">${escapeHtml(song.name)}</h2>
            <p class="lastfm-widget__meta">by <b>${escapeHtml(song.artist)}</b></p>
            ${album}
        </div>
    `;

    if (song.url) {
        widgetContainer.setAttribute("role", "link");
        if (widgetContainer.tagName === "A") {
            widgetContainer.href = song.url;
        } else {
            widgetContainer.style.cursor = "pointer";
            widgetContainer.onclick = () => window.open(song.url, "_blank", "noopener");
        }
    }
}

// theme: "light" | "dark" | "auto" | "bg" | "banner"
function loadWidget(theme = "auto", username, refreshInterval = 10000) {
    widgetContainer.classList.add("lastfm-widget");
    widgetContainer.dataset.theme = theme;

    let firstLoad = true;

    async function refresh() {
        if (firstLoad) {
            renderLoading();
        }

        try {
            const song = await fetchSong(username);
            renderSong(song);
        } catch (error) {
            console.error(error);
            if (firstLoad) {
                renderError("Couldn't load the last played track.");
            }
        } finally {
            firstLoad = false;
        }
    }

    refresh();

    if (refreshInterval && refreshInterval > 0) {
        return setInterval(refresh, refreshInterval);
    }
}