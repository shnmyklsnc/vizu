// Site-wide navigation: the search box (works on every page, reads the
// embedded #search-data index) and the category pills / tag chips
// (filter the homepage grid in place when a grid is present, otherwise
// just navigate to the homepage with a ?category=/?tag= query string,
// which this same script reads on load to apply the filter there).

function getSearchIndex() {
  const el = document.getElementById("search-data");
  if (!el) return [];
  try {
    return JSON.parse(el.textContent);
  } catch (e) {
    return [];
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function setupSearch() {
  const input = document.getElementById("site-search");
  const results = document.getElementById("search-results");
  if (!input || !results) return;
  const index = getSearchIndex();

  function render(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      results.hidden = true;
      results.innerHTML = "";
      return;
    }

    const matches = index
      .filter((item) => {
        return (
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .slice(0, 8);

    if (matches.length === 0) {
      results.innerHTML = '<div class="search-empty">No matches.</div>';
    } else {
      results.innerHTML = matches
        .map((m) => {
          const meta = m.tags.length ? `${m.category} · ${m.tags.join(", ")}` : m.category;
          return `<a class="search-hit" href="${m.url}"><span class="search-hit-title">${escapeHtml(m.title)}</span><span class="search-hit-meta">${escapeHtml(meta)}</span></a>`;
        })
        .join("");
    }
    results.hidden = false;
  }

  input.addEventListener("input", () => render(input.value));
  input.addEventListener("focus", () => {
    if (input.value) render(input.value);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) results.hidden = true;
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      results.hidden = true;
      input.blur();
    }
  });
}

function setupFilters() {
  const grid = document.querySelector(".grid");
  const pills = document.querySelectorAll(".category-pills .pill");
  const filterStatus = document.getElementById("filter-status");
  const emptyState = document.getElementById("empty-state");

  // Off the homepage there's no grid to filter, so pills and tag chips
  // just behave as ordinary links to "/?category=..." / "/?tag=...".
  if (!grid) return;

  function cardMatches(card, category, tag) {
    if (category) return (card.dataset.category || "") === category;
    if (tag) return (card.dataset.tags || "").split(",").filter(Boolean).includes(tag);
    return true;
  }

  function applyFilter(category, tag) {
    const cards = grid.querySelectorAll(".card");
    let anyVisible = false;
    cards.forEach((card) => {
      const visible = cardMatches(card, category, tag);
      card.style.display = visible ? "" : "none";
      if (visible) anyVisible = true;
    });

    pills.forEach((pill) => {
      pill.classList.toggle("active", (pill.dataset.category || "") === category && !tag);
    });

    if (tag && filterStatus) {
      filterStatus.hidden = false;
      filterStatus.innerHTML = `Showing tag: <strong>${escapeHtml(tag)}</strong> &middot; <a href="#" id="clear-filter">clear</a>`;
      const clear = document.getElementById("clear-filter");
      if (clear) {
        clear.addEventListener("click", (e) => {
          e.preventDefault();
          history.pushState({}, "", location.pathname);
          applyFilter("", "");
        });
      }
    } else if (filterStatus) {
      filterStatus.hidden = true;
      filterStatus.innerHTML = "";
    }

    if (emptyState) emptyState.hidden = anyVisible;
  }

  function interceptClick(el, getCategory, getTag) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const category = getCategory ? getCategory(el) : "";
      const tag = getTag ? getTag(el) : "";
      const url = new URL(el.href);
      history.pushState({}, "", category || tag ? url.search : location.pathname);
      applyFilter(category, tag);
    });
  }

  pills.forEach((pill) => interceptClick(pill, (p) => p.dataset.category || "", () => ""));
  document.querySelectorAll(".tag-chip").forEach((chip) => {
    interceptClick(chip, () => "", (c) => new URL(c.href).searchParams.get("tag") || "");
  });

  const params = new URLSearchParams(location.search);
  applyFilter(params.get("category") || "", params.get("tag") || "");
}

// Minimal line-art icons (a plain circle+rays sun, a plain crescent moon),
// drawn with currentColor so they pick up the button's theme color. Shown
// is the theme a click would switch TO -- moon while already in light mode.
const SUN_ICON =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/></svg>';
const MOON_ICON =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg>';

function setupTheme() {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  const KEY = "vizu-theme";

  function sync() {
    const theme = root.getAttribute("data-theme") === "light" ? "light" : "dark";
    if (btn) {
      btn.innerHTML = theme === "light" ? MOON_ICON : SUN_ICON;
      btn.setAttribute("aria-label", theme === "light" ? "Switch to dark theme" : "Switch to light theme");
    }
  }

  sync();

  if (btn) {
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      sync();
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
    });
  }
}

function setupPanelToggle() {
  const btn = document.getElementById("panel-toggle");
  const layout = document.getElementById("sketch-layout");
  if (!btn || !layout) return;

  function sync() {
    const hidden = layout.classList.contains("panel-hidden");
    btn.textContent = hidden ? "Show controls" : "Hide controls";
    btn.setAttribute("aria-expanded", String(!hidden));
  }

  sync();

  btn.addEventListener("click", () => {
    layout.classList.toggle("panel-hidden");
    sync();
  });
}

// Same currentColor line-art style as the sun/moon icons above: plain
// corner brackets pointing outward (enter) or inward (exit).
const EXPAND_ICON =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/></svg>';
const COMPRESS_ICON =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v3a2 2 0 0 1-2 2H4M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';

// Fullscreens just the canvas (#sketch-holder), not the whole sketch
// layout, so the parameter panel -- which lives in a sibling element --
// is never part of it. The button itself lives inside #sketch-holder (see
// article.html) rather than beside it, since the Fullscreen API hides
// everything outside the fullscreened element -- a sibling button would be
// unreachable the moment fullscreen starts. See the #sketch-holder:fullscreen
// rules in style.css for how the canvas is centered and scaled once inside.
function setupFullscreen() {
  const btn = document.getElementById("fullscreen-toggle");
  const holder = document.getElementById("sketch-holder");
  if (!btn || !holder) return;

  const request = holder.requestFullscreen || holder.webkitRequestFullscreen;
  const exit = document.exitFullscreen
    ? () => document.exitFullscreen()
    : document.webkitExitFullscreen
    ? () => document.webkitExitFullscreen()
    : null;

  // No Fullscreen API support (rare) -- hide the button rather than leave a
  // control that does nothing.
  if (!request || !exit) {
    btn.style.display = "none";
    return;
  }

  function current() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function sync() {
    const active = current() === holder;
    btn.innerHTML = active ? COMPRESS_ICON : EXPAND_ICON;
    btn.setAttribute("aria-label", active ? "Exit fullscreen" : "View fullscreen");
    btn.setAttribute("aria-pressed", String(active));
  }

  btn.addEventListener("click", () => {
    if (current() === holder) {
      exit();
    } else {
      // webkitRequestFullscreen (old Safari) doesn't return a promise like
      // the standard method does, so wrap it before chaining .catch.
      Promise.resolve(request.call(holder)).catch(() => {});
    }
  });

  document.addEventListener("fullscreenchange", sync);
  document.addEventListener("webkitfullscreenchange", sync);
  sync();
}

document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  setupFilters();
  setupTheme();
  setupPanelToggle();
  setupFullscreen();
});
