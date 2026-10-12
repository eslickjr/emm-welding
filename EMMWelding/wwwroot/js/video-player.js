// Brings every <VideoPlayer> component on the page to life.
// Plain browser JavaScript: no C# round-trips, so the controls respond instantly.
(() => {
    // Players already wired up, so we never attach the same listeners twice.
    const players = new WeakMap();

    const formatTime = (seconds) => {
        if (!Number.isFinite(seconds)) return "0:00";
        const total = Math.floor(seconds);
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = String(total % 60).padStart(2, "0");
        return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
    };

    function setup(root) {
        const video = root.querySelector("video");
        const find = (selector) => root.querySelector(selector);
        const playButtons = root.querySelectorAll("[data-vp-play]");
        const muteButton = find("[data-vp-mute]");
        const volume = find("[data-vp-volume]");
        const seek = find("[data-vp-seek]");
        const current = find("[data-vp-current]");
        const duration = find("[data-vp-duration]");
        const pipButton = find("[data-vp-pip]");
        const fullscreenButton = find("[data-vp-fullscreen]");
        let idleTimer;
        let tappedWhileIdle = false;

        // Copies the video's current state onto the player (data-* attributes and CSS variables).
        // The CSS file reads those to swap icons and fill the progress bars.
        const sync = () => {
            video.controls = false;             // hide the browser's built-in controls...
            root.classList.add("vp-enhanced");  // ...and show ours instead

            const playing = !video.paused && !video.ended;
            root.dataset.playing = String(playing);
            playButtons.forEach((b) => b.setAttribute("aria-label", playing ? "Pause" : "Play"));

            const muted = video.muted || video.volume === 0;
            root.dataset.muted = String(muted);
            muteButton.setAttribute("aria-label", muted ? "Unmute" : "Mute");
            volume.value = muted ? 0 : video.volume;
            root.style.setProperty("--vp-volume", `${volume.value * 100}%`);

            const playedPct = video.duration ? (video.currentTime / video.duration) * 100 : 0;
            seek.value = playedPct;
            root.style.setProperty("--vp-played", `${playedPct}%`);
            current.textContent = formatTime(video.currentTime);
            duration.textContent = formatTime(video.duration);

            if (video.buffered.length && video.duration) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                root.style.setProperty("--vp-buffered", `${(bufferedEnd / video.duration) * 100}%`);
            }

            const fullscreen = document.fullscreenElement === root;
            root.dataset.fullscreen = String(fullscreen);
            fullscreenButton.setAttribute("aria-label", fullscreen ? "Exit full screen" : "Enter full screen");
        };

        const togglePlay = () => {
            if (video.paused || video.ended) video.play().catch(() => { });
            else video.pause();
        };

        const toggleFullscreen = () => {
            if (document.fullscreenElement) document.exitFullscreen();
            else if (root.requestFullscreen) root.requestFullscreen();
            else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); // iPhone Safari
        };

        // Show the controls, then hide them again after 2.5s without movement while playing.
        const wake = () => {
            root.classList.remove("vp-idle");
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                if (!video.paused) root.classList.add("vp-idle");
            }, 2500);
        };

        // ---- Buttons and sliders ----
        playButtons.forEach((b) => b.addEventListener("click", togglePlay));

        // On phones, the first tap on a playing video just brings the controls back.
        video.addEventListener("pointerdown", (e) => {
            tappedWhileIdle = e.pointerType !== "mouse" && root.classList.contains("vp-idle");
        });
        video.addEventListener("click", () => {
            if (!tappedWhileIdle) togglePlay();
        });
        video.addEventListener("dblclick", toggleFullscreen);

        muteButton.addEventListener("click", () => {
            if (video.muted || video.volume === 0) {
                video.muted = false;
                if (video.volume === 0) video.volume = 1;
            } else {
                video.muted = true;
            }
        });

        volume.addEventListener("input", () => {
            video.volume = Number(volume.value);
            video.muted = video.volume === 0;
        });

        seek.addEventListener("input", () => {
            if (video.duration) video.currentTime = (seek.value / 100) * video.duration;
        });

        if (document.pictureInPictureEnabled && !video.disablePictureInPicture) {
            pipButton.addEventListener("click", () => {
                if (document.pictureInPictureElement) document.exitPictureInPicture();
                else video.requestPictureInPicture().catch(() => { });
            });
        } else {
            pipButton.hidden = true; // e.g. Firefox doesn't offer this API
        }

        fullscreenButton.addEventListener("click", toggleFullscreen);
        root.addEventListener("fullscreenchange", sync);

        // ---- Keyboard shortcuts (when the player itself has focus) ----
        root.addEventListener("keydown", (e) => {
            if (e.target.closest("button, a, input")) return; // let controls handle their own keys
            switch (e.key) {
                case " ":
                case "k": togglePlay(); break;
                case "ArrowLeft": video.currentTime = Math.max(0, video.currentTime - 5); break;
                case "ArrowRight": video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 5); break;
                case "m": muteButton.click(); break;
                case "f": toggleFullscreen(); break;
                default: return;
            }
            e.preventDefault();
            wake();
        });

        // ---- Keep the UI in step with the video ----
        ["play", "pause", "ended", "timeupdate", "durationchange", "loadedmetadata", "progress", "volumechange", "seeked"]
            .forEach((name) => video.addEventListener(name, sync));

        video.addEventListener("waiting", () => { root.dataset.loading = "true"; });
        ["playing", "canplay", "pause", "error"]
            .forEach((name) => video.addEventListener(name, () => { root.dataset.loading = "false"; }));

        ["pointermove", "pointerdown", "focusin"].forEach((name) => root.addEventListener(name, wake));
        video.addEventListener("play", wake);
        video.addEventListener("pause", wake);

        sync();
        return sync;
    }

    function initAll() {
        document.querySelectorAll("[data-video-player]").forEach((root) => {
            const sync = players.get(root);
            if (sync) sync();                 // already set up: just re-apply its state
            else players.set(root, setup(root));
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
    else initAll();

    // Blazor's "enhanced navigation" swaps page content without a full reload when you click
    // a link, so DOMContentLoaded won't fire again. Blazor raises this event instead.
    window.Blazor?.addEventListener("enhancedload", initAll);
})();