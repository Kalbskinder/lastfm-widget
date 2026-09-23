import { useEffect, useState } from "react";
import "./widget.css";

const API_BASE = "https://lastfm-last-played.biancarosa.com.br";

export type Theme = "light" | "dark" | "auto";

export interface LastfmWidgetProps {
    username: string;
    theme?: Theme;
    refreshInterval?: number;
}

interface Song {
    name: string;
    album: string;
    artist: string;
    cover: string;
    url: string;
    nowPlaying: boolean;
}

interface LastfmImage {
    size: string;
    "#text": string;
}

interface LastfmTrack {
    name: string;
    url: string;
    image?: LastfmImage[];
    album?: { "#text": string };
    artist?: { "#text": string };
    "@attr"?: { nowplaying?: string };
}

type WidgetState =
    | { status: "loading" }
    | { status: "loaded"; song: Song }
    | { status: "error" };

async function fetchSong(username: string, signal: AbortSignal): Promise<Song> {
    const response = await fetch(`${API_BASE}/${username}/latest-song`, { signal });

    if (!response.ok) {
        throw new Error(`Failed to fetch last played song (${response.status})`);
    }

    const data: { track: LastfmTrack } = await response.json();
    const track = data.track;

    const getImage = (size: string): string => {
        const img = (track.image || []).find((img) => img.size === size);
        return img ? img["#text"] : "";
    };

    return {
        name: track.name,
        album: track.album ? track.album["#text"] : "",
        artist: track.artist ? track.artist["#text"] : "",
        cover: getImage("extralarge") || getImage("medium") || getImage("small"),
        url: track.url,
        nowPlaying: track["@attr"] ? track["@attr"].nowplaying === "true" : false
    };
}

function Loading() {
    return (
        <>
            <div className="lastfm-widget__cover" />
            <div className="lastfm-widget__body">
                <div className="lastfm-widget__skeleton lastfm-widget__skeleton--sm" />
                <div className="lastfm-widget__skeleton lastfm-widget__skeleton--md" />
                <div className="lastfm-widget__skeleton lastfm-widget__skeleton--sm" />
            </div>
        </>
    );
}

function Song({ song }: { song: Song }) {
    return (
        <>
            {song.cover ? (
                <img
                    className="lastfm-widget__cover"
                    src={song.cover}
                    alt={`${song.album || song.name} cover`}
                    loading="lazy"
                />
            ) : (
                <div className="lastfm-widget__cover lastfm-widget__cover--placeholder">♪</div>
            )}
            <div className="lastfm-widget__body">
                {song.nowPlaying ? (
                    <span className="lastfm-widget__status lastfm-widget__status--live">
                        <span className="lastfm-widget__eq">
                            <span />
                            <span />
                            <span />
                        </span>
                        Now playing
                    </span>
                ) : (
                    <span className="lastfm-widget__status">Last played</span>
                )}
                <h2 className="lastfm-widget__title">{song.name}</h2>
                <p className="lastfm-widget__meta">
                    by <b>{song.artist}</b>
                </p>
                {song.album && (
                    <p className="lastfm-widget__meta">
                        from <b>{song.album}</b>
                    </p>
                )}
            </div>
        </>
    );
}

export default function LastfmWidget({
    username,
    theme = "auto",
    refreshInterval = 10000
}: LastfmWidgetProps) {
    const [state, setState] = useState<WidgetState>({ status: "loading" });

    useEffect(() => {
        const controller = new AbortController();

        setState({ status: "loading" });

        const load = () =>
            fetchSong(username, controller.signal)
                .then((song) => setState({ status: "loaded", song }))
                .catch((error: unknown) => {
                    if (error instanceof DOMException && error.name === "AbortError") return;
                    console.error(error);
                    setState({ status: "error" });
                });

        load();

        const id =
            refreshInterval > 0 ? setInterval(load, refreshInterval) : undefined;

        return () => {
            controller.abort();
            if (id) clearInterval(id);
        };
    }, [username, refreshInterval]);

    const classNames = ["lastfm-widget"];
    if (state.status === "loading") classNames.push("lastfm-widget--loading");
    if (state.status === "error") classNames.push("lastfm-widget--error");

    if (state.status === "error") {
        return (
            <div className={classNames.join(" ")} data-theme={theme}>
                Couldn't load the last played track.
            </div>
        );
    }

    const song = state.status === "loaded" ? state.song : null;

    const Wrapper = song?.url ? "a" : "div";
    const wrapperProps = song?.url
        ? { href: song.url, target: "_blank", rel: "noopener noreferrer" }
        : {};

    return (
        <Wrapper className={classNames.join(" ")} data-theme={theme} {...wrapperProps}>
            {state.status === "loading" ? <Loading /> : song && <Song song={song} />}
        </Wrapper>
    );
}
