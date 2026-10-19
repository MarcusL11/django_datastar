import { createSignalCollector } from "./signal-collector.js";
import { findSignalMatches } from "./signal-filter.js";

function installSignalView() {
  if (document.querySelector("[data-datastar-signal-toggle]")) return;

  const control = document.createElement("div");
  control.className = "datastar-signal-control";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "datastar-signal-toggle";
  toggle.setAttribute("data-datastar-signal-toggle", "");
  toggle.setAttribute("aria-controls", "datastar-signal-view");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Signals");

  const view = document.createElement("section");
  view.id = "datastar-signal-view";
  view.className = "datastar-signal-view";
  view.setAttribute("data-datastar-signal-view", "");
  view.setAttribute("aria-label", "Datastar signals");
  view.hidden = true;

  const searchLabel = document.createElement("label");
  searchLabel.htmlFor = "datastar-signal-search";
  searchLabel.className = "datastar-signal-search-label";
  searchLabel.textContent = "Search signal names";

  const search = document.createElement("input");
  search.id = "datastar-signal-search";
  search.type = "search";
  search.autocomplete = "off";
  search.className = "datastar-signal-search";
  search.setAttribute("data-datastar-signal-search", "");

  const status = document.createElement("p");
  status.className = "datastar-signal-status";
  status.setAttribute("data-datastar-signal-status", "");
  status.textContent = "Signals unavailable.";

  const noMatches = document.createElement("p");
  noMatches.className = "datastar-signal-no-matches";
  noMatches.setAttribute("data-datastar-signal-no-matches", "");
  noMatches.textContent = "No matching signals.";
  noMatches.hidden = true;

  const output = document.createElement("pre");
  output.className = "datastar-signal-output";
  output.setAttribute("data-datastar-signal-output", "");
  output.hidden = true;

  view.append(searchLabel, search, status, noMatches, output);
  control.append(toggle, view);
  document.body.append(control);

  toggle.addEventListener("click", () => {
    view.hidden = !view.hidden;
    toggle.setAttribute("aria-expanded", String(!view.hidden));
    if (!view.hidden) search.focus();
  });

  let currentState = { status: "unavailable" };
  function render() {
    if (currentState.status !== "ready") {
      output.textContent = "";
      output.hidden = true;
      noMatches.hidden = true;
      status.hidden = false;
      return;
    }

    const query = search.value.trim();
    const matches = query ? findSignalMatches(currentState.value, query) : null;
    const hasMatches = matches === null || matches.length > 0;
    status.hidden = true;
    noMatches.hidden = hasMatches;
    output.hidden = !hasMatches;
    if (!hasMatches) {
      output.textContent = "";
      return;
    }
    output.textContent = matches === null
      ? JSON.stringify(currentState.value, null, 2)
      : matches.map(({ path, value }) => `${path}: ${JSON.stringify(value, null, 2)}`).join("\n\n");
  }

  search.addEventListener("input", render);
  createSignalCollector((state) => {
    currentState = state;
    render();
  });

  const controlObserver = new MutationObserver(() => {
    if (!control.isConnected) document.body.append(control);
  });
  controlObserver.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installSignalView, { once: true });
} else {
  installSignalView();
}
