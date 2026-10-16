export function createSignalCollector(onState) {
  const collector = document.createElement("pre");
  collector.hidden = true;
  collector.setAttribute("data-json-signals__terse", "");
  document.body.append(collector);

  function readProjection() {
    let value;
    try {
      const text = collector.textContent;
      if (text) value = JSON.parse(text);
    } catch {
      value = undefined;
    }

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      onState({ status: "ready", value });
    } else {
      onState({ status: "unavailable" });
    }
  }

  const observer = new MutationObserver(readProjection);
  observer.observe(collector, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  readProjection();

  return () => {
    observer.disconnect();
    collector.remove();
  };
}
