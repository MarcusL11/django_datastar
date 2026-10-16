export function createSignalCollector(onState) {
  let collector;
  let projectionObserver;
  let stopped = false;

  function readProjection(node) {
    if (stopped || node !== collector || node.isConnected === false) return;
    let value;
    try {
      const text = node.textContent;
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

  function mount() {
    const node = document.createElement("pre");
    node.hidden = true;
    node.setAttribute("data-json-signals__terse", "");
    collector = node;
    document.body.append(node);
    projectionObserver = new MutationObserver(() => readProjection(node));
    projectionObserver.observe(node, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    readProjection(node);
  }

  const bodyObserver = new MutationObserver(() => {
    if (stopped || collector.isConnected !== false) return;
    projectionObserver.disconnect();
    onState({ status: "unavailable" });
    mount();
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
  mount();

  return () => {
    stopped = true;
    bodyObserver.disconnect();
    projectionObserver.disconnect();
    collector.remove();
  };
}
