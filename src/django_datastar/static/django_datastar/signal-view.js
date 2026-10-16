import { createSignalCollector } from "./signal-collector.js";

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
  toggle.textContent = "Signals";

  const view = document.createElement("section");
  view.id = "datastar-signal-view";
  view.className = "datastar-signal-view";
  view.setAttribute("data-datastar-signal-view", "");
  view.setAttribute("aria-label", "Datastar signals");
  view.hidden = true;

  const status = document.createElement("p");
  status.className = "datastar-signal-status";
  status.setAttribute("data-datastar-signal-status", "");
  status.textContent = "Signals unavailable.";

  const output = document.createElement("pre");
  output.className = "datastar-signal-output";
  output.setAttribute("data-datastar-signal-output", "");
  output.hidden = true;

  view.append(status, output);
  control.append(toggle, view);
  document.body.append(control);

  toggle.addEventListener("click", () => {
    view.hidden = !view.hidden;
    toggle.setAttribute("aria-expanded", String(!view.hidden));
  });

  createSignalCollector((state) => {
    if (state.status === "ready") {
      output.textContent = JSON.stringify(state.value, null, 2);
      output.hidden = false;
      status.hidden = true;
    } else {
      output.textContent = "";
      output.hidden = true;
      status.hidden = false;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installSignalView, { once: true });
} else {
  installSignalView();
}
