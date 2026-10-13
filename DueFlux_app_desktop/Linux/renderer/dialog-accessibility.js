(function (root) {
  "use strict";
  function init(options) {
    const backdrops = Array.from(document.querySelectorAll(".modal-backdrop, .settings-backdrop"));
    const stack = [];
    const previousFocus = new Map();
    const savedInert = new Map();
    const visible = function (element) { return !element.classList.contains("hidden") && element.getClientRects().length > 0; };
    const focusable = function (panel) {
      return Array.from(panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]'))
        .filter(function (element) { return !element.disabled && element.tabIndex >= 0 && element.getClientRects().length > 0; });
    };
    function refresh() {
      savedInert.forEach(function (value, element) { element.inert = value; });
      savedInert.clear();
      backdrops.forEach(function (backdrop, index) {
        const panel = backdrop.firstElementChild;
        if (!panel) return;
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        panel.tabIndex = -1;
        const title = panel.querySelector("h2, h3");
        if (title) {
          if (!title.id) title.id = "dialog-heading-" + index;
          panel.setAttribute("aria-labelledby", title.id);
        }
        panel.querySelectorAll("button").forEach(function (button) {
          if (/^[x×✕✖]$/i.test(button.textContent.trim())) button.setAttribute("aria-label", options.closeLabel());
        });
        const position = stack.indexOf(backdrop);
        if (visible(backdrop) && position < 0) {
          previousFocus.set(backdrop, document.activeElement);
          stack.push(backdrop);
          (focusable(panel)[0] || panel).focus({ preventScroll: true });
        } else if (!visible(backdrop) && position >= 0) {
          const wasTop = position === stack.length - 1;
          stack.splice(position, 1);
          const target = previousFocus.get(backdrop);
          previousFocus.delete(backdrop);
          if (wasTop && target && target.isConnected) target.focus({ preventScroll: true });
        }
      });
      const top = stack[stack.length - 1];
      if (!top) return;
      stack.forEach(function (backdrop, index) { backdrop.style.zIndex = String(200 + index); });
      const app = document.getElementById("app-screen");
      const background = app ? Array.from(app.children) : [];
      Array.from(new Set(background.concat(backdrops))).forEach(function (element) {
        if (element === top || element.contains(top)) return;
        savedInert.set(element, element.inert);
        element.inert = true;
      });
    }
    backdrops.forEach(function (backdrop) {
      new MutationObserver(refresh).observe(backdrop, { attributes: true, attributeFilter: ["class"] });
    });
    document.addEventListener("keydown", function (event) {
      const top = stack[stack.length - 1];
      if (!top) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (options.close[top.id]) options.close[top.id]();
      } else if (event.key === "Tab") {
        const panel = top.firstElementChild;
        const items = focusable(panel);
        const current = items.indexOf(document.activeElement);
        if (!items.length) { event.preventDefault(); panel.focus(); }
        else if (event.shiftKey && current <= 0) { event.preventDefault(); items[items.length - 1].focus(); }
        else if (!event.shiftKey && (current < 0 || current === items.length - 1)) { event.preventDefault(); items[0].focus(); }
      }
    }, true);
    root.DueFluxDialogs.refresh = refresh;
    refresh();
  }
  root.DueFluxDialogs = { init: init, refresh: function () {} };
})(window);
