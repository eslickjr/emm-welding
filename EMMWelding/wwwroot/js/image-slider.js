// Brings every <ImageSlider> component on the page to life.
//
// How the seamless loop works:
//   The script adds a copy of the LAST image before the first, and a copy of the FIRST image
//   after the last:   [copy of 3] [1] [2] [3] [copy of 1]
//   Going forward from 3 slides onto "copy of 1", which looks identical to 1. As soon as that
//   slide finishes, we jump (with the animation switched off) to the real 1. Nobody can see the
//   jump, so it looks like an endless loop. Going backward from 1 works the same way in reverse.
(() => {
    const sliders = new WeakMap();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function setup(root) {
        const track = root.querySelector(".slider-track");
        const slides = [...root.querySelectorAll(".slider-slide")];
        const count = slides.length;

        if (count < 2) {
            root.classList.add("slider-ready");
            return () => { };
        }

        const dots = [...root.querySelectorAll("[data-slider-dot]")];
        const prevButton = root.querySelector("[data-slider-prev]");
        const nextButton = root.querySelector("[data-slider-next]");
        const interval = Number(root.dataset.interval) || 5000;

        // Position in the track INCLUDING the copies: 0 = copy of last, 1..count = real slides,
        // count + 1 = copy of first.
        let position = 1;
        let timer = null;
        let hovering = false;   // mouse is over the slider
        let focused = false;    // keyboard user has tabbed into it
        let swipeStartX = null;

        // Adds (or re-adds) the two copies at each end of the track.
        const addCopies = () => {
            track.querySelectorAll("[data-slider-copy]").forEach((copy) => copy.remove());

            const makeCopy = (slide) => {
                const copy = slide.cloneNode(true);
                copy.setAttribute("data-slider-copy", "");
                copy.setAttribute("aria-hidden", "true");
                copy.removeAttribute("aria-label");
                copy.querySelector("img")?.setAttribute("loading", "eager");
                return copy;
            };

            track.prepend(makeCopy(slides[count - 1]));
            track.append(makeCopy(slides[0]));
        };

        // Which real image (0..count-1) is showing, even when we're on a copy.
        const currentIndex = () => (position - 1 + count) % count;

        // Make sure the current and next photo are downloading, so a slide never shows a blank.
        const preload = (i) => {
            const img = slides[i]?.querySelector("img");
            if (img) img.loading = "eager";
        };

        // Moves the track to `position`, with or without the slide animation.
        const render = (animate = true) => {
            track.style.transition = animate ? "" : "none";
            track.style.transform = `translateX(-${position * 100}%)`;

            const current = currentIndex();
            slides.forEach((slide, i) => slide.setAttribute("aria-hidden", String(i !== current)));
            dots.forEach((dot, i) => dot.setAttribute("aria-current", String(i === current)));
            preload(current);
            preload((current + 1) % count);
        };

        // If we're sitting on a copy, jump to the matching real slide without animating.
        const jumpOffCopy = () => {
            if (position === 0) position = count;
            else if (position === count + 1) position = 1;
            else return;

            render(false);
            void track.offsetWidth; // forces the browser to apply the jump before the next animated move
        };

        // Runs when each slide animation finishes.
        track.addEventListener("transitionend", (e) => {
            if (e.target === track && e.propertyName === "transform") jumpOffCopy();
        });

        const step = (direction) => {
            jumpOffCopy();          // in case a click lands mid-animation, or animations are off
            position += direction;  // +1 = next, -1 = previous
            render();
        };

        const showImage = (i) => {
            jumpOffCopy();
            position = i + 1;
            render();
        };

        // ---- Auto-play ----
        const stop = () => {
            clearInterval(timer);
            timer = null;
        };

        const start = () => {
            stop();
            if (!root.isConnected) return;   // slider was removed by page navigation
            if (hovering || focused || document.hidden || reducedMotion.matches) return;
            timer = setInterval(() => step(1), interval);
        };

        // When the user moves the slider themselves, restart the countdown
        // so it doesn't jump again a split second later.
        const byUser = (action) => {
            action();
            start();
        };

        // ---- Buttons ----
        prevButton?.addEventListener("click", () => byUser(() => step(-1)));
        nextButton?.addEventListener("click", () => byUser(() => step(1)));
        dots.forEach((dot, i) => dot.addEventListener("click", () => byUser(() => showImage(i))));

        // ---- Keyboard: left/right arrows when the slider has focus ----
        root.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft") byUser(() => step(-1));
            else if (e.key === "ArrowRight") byUser(() => step(1));
            else return;
            e.preventDefault();
        });

        // ---- Swipe on phones/tablets ----
        track.addEventListener("pointerdown", (e) => {
            if (e.pointerType !== "mouse") swipeStartX = e.clientX;
        });
        track.addEventListener("pointerup", (e) => {
            if (swipeStartX === null) return;
            const distance = e.clientX - swipeStartX;
            swipeStartX = null;
            if (Math.abs(distance) > 40) byUser(() => step(distance < 0 ? 1 : -1));
        });
        track.addEventListener("pointercancel", () => { swipeStartX = null; });

        // ---- Pause while someone is looking at / using it ----
        root.addEventListener("pointerenter", (e) => {
            if (e.pointerType === "mouse") { hovering = true; stop(); }
        });
        root.addEventListener("pointerleave", (e) => {
            if (e.pointerType === "mouse") { hovering = false; start(); }
        });
        root.addEventListener("focusin", (e) => {
            if (e.target.matches(":focus-visible")) { focused = true; stop(); }
        });
        root.addEventListener("focusout", (e) => {
            if (!root.contains(e.relatedTarget)) { focused = false; start(); }
        });

        // Stop while the browser tab is in the background; resume when it's back.
        document.addEventListener("visibilitychange", start);
        reducedMotion.addEventListener("change", start);

        // Called on first load, and again if Blazor's navigation refreshes the slider's HTML
        // (which would remove our copies and reset the position).
        const refresh = () => {
            root.classList.add("slider-ready");
            if (!track.querySelector("[data-slider-copy]")) addCopies();
            render(false);
        };

        refresh();
        start();
        return refresh;
    }

    function initAll() {
        document.querySelectorAll("[data-image-slider]").forEach((root) => {
            const refresh = sliders.get(root);
            if (refresh) refresh();               // already set up: just re-apply its state
            else sliders.set(root, setup(root));
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
    else initAll();

    // Re-run after Blazor's enhanced navigation swaps in a new page.
    window.Blazor?.addEventListener("enhancedload", initAll);
})();