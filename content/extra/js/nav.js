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

document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  setupFilters();
});
