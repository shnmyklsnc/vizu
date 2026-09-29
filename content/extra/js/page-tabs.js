// Generic page-level section tabs (Learn / Recurrence / Try it, or
// whatever a given article calls them) -- the top-level navigation shared
// by every redesigned article, as opposed to the underlined .steps nav
// inside an individual widget. One .page-tabs bar of [role="tab"]
// buttons, each pointing via aria-controls at the .tab-panel it shows or
// hides. A plain roving tablist: click or arrow keys move focus and
// selection, Home/End jump to the ends.
//
// Loaded once per freeform article (see the article.layout check in
// theme/templates/article.html), so it never needs to be copy-pasted into
// each article's own walkthroughs.js. Nothing here measures a panel's
// size, so it's safe for every widget inside a panel to init while that
// panel starts hidden -- each article's own script should keep that same
// property.
(function () {
  "use strict";

  function initPageTabs() {
    var tablist = document.querySelector(".page-tabs");
    if (!tablist) return;
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;
    var panels = tabs.map(function (t) {
      return document.getElementById(t.getAttribute("aria-controls"));
    });

    function activate(index, focus) {
      tabs.forEach(function (t, i) {
        var on = i === index;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        if (panels[i]) panels[i].hidden = !on;
      });
      if (focus) tabs[index].focus();
    }

    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () {
        activate(i, false);
      });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          activate((i + 1) % tabs.length, true);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          activate((i - 1 + tabs.length) % tabs.length, true);
        } else if (e.key === "Home") {
          e.preventDefault();
          activate(0, true);
        } else if (e.key === "End") {
          e.preventDefault();
          activate(tabs.length - 1, true);
        }
      });
    });

    activate(0, false);
  }

  document.addEventListener("DOMContentLoaded", initPageTabs);
})();
