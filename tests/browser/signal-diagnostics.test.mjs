import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import "./signal-lifecycle.test.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const staticDir = fileURLToPath(
  new URL("../../src/django_datastar/static/django_datastar/", import.meta.url),
);
const bundle = await readFile(join(here, "fixtures/datastar-1.0.4.js"));
assert.equal(
  createHash("sha256").update(bundle).digest("hex"),
  "727844adfc825ee651fb93c544a2a739986f9a21820a94524b35f0cac470cf91",
);

const page = `<!doctype html>
<html lang="en" data-signals="{count: 2, enabled: false, user: {name: 'Ada'}, secret: 'browser-secret'}">
<head><meta charset="utf-8"><title>Signal test</title>
<script type="module" src="/datastar.js"></script>
<link rel="stylesheet" href="/signal-view.css">
</head>
<body>
<pre id="bundle-probe" hidden data-json-signals__terse></pre>
<button id="change-enabled" data-on:click="$enabled = !$enabled">Change enabled</button>
<script type="module" src="/signal-view.js"></script>
<script type="module">
  const waitFor = async (condition, state) => {
    for (let i = 0; i < 80; i++) {
      if (condition()) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('The browser did not show ' + state + '. Projection: ' + collector()?.textContent);
  };
  const probe = () => document.querySelector('#bundle-probe');
  const collector = () => document.querySelector('pre[data-json-signals__terse]:not(#bundle-probe)');
  const toggle = () => document.querySelector('[data-datastar-signal-toggle]');
  const view = () => document.querySelector('[data-datastar-signal-view]');
  const output = () => document.querySelector('[data-datastar-signal-output]');
  const status = () => document.querySelector('[data-datastar-signal-status]');
  const search = () => document.querySelector('[data-datastar-signal-search]');
  const noMatches = () => document.querySelector('[data-datastar-signal-no-matches]');
  const visible = (element) => element && getComputedStyle(element).display !== 'none' && !element.hidden;
  const searchFor = (query) => {
    search().value = query;
    search().dispatchEvent(new Event('input', {bubbles: true}));
  };
  try {
    await waitFor(() => {
      try { return JSON.parse(probe()?.textContent).count === 2; }
      catch { return false; }
    }, 'the Datastar projection');
    if (!window.datastar) {
      const module = await import('/datastar.js');
      if (!module.root) throw new Error('The selected bundle has no signal root.');
      window.datastar = module;
    }
    await waitFor(() => toggle() && collector(), 'the staff control and collector');
    if (toggle().textContent.trim()) throw new Error('The icon button shows text.');
    if (toggle().getAttribute('aria-label') !== 'Signals') throw new Error('The icon button has no accessible name.');
    const buttonRect = toggle().getBoundingClientRect();
    if (Math.abs(window.innerWidth - buttonRect.right) > 32 || Math.abs(window.innerHeight - buttonRect.bottom) > 32) {
      throw new Error('The icon button is not at the bottom right.');
    }
    if (buttonRect.width < 44 || buttonRect.height < 44) throw new Error('The icon button is too small.');
    const iconUrl = '/img/django-datastar-icon.svg';
    if (!getComputedStyle(toggle()).backgroundImage.includes(iconUrl)) {
      throw new Error('The control does not use the package icon.');
    }
    const icon = new Image();
    icon.src = iconUrl;
    await icon.decode();
    if (icon.naturalWidth === 0) throw new Error('The package icon did not load.');
    if (visible(view())) throw new Error('The view opened without a staff action.');
    toggle().click();
    await waitFor(() => visible(view()) && output()?.textContent.includes('browser-secret'), 'the raw view');
    if (view().getBoundingClientRect().bottom > toggle().getBoundingClientRect().top) {
      throw new Error('The panel is not above the icon button.');
    }
    if (!output().textContent.includes('Ada') || !output().textContent.includes('2')) {
      throw new Error('The view does not show raw signal values.');
    }
    if (search()?.labels[0]?.textContent !== 'Search signal names' || !visible(search())) {
      throw new Error('The search field has no visible label.');
    }
    searchFor('NAME');
    await waitFor(() => output()?.textContent.includes('user.name: "Ada"'), 'the nested search result');
    if (output().textContent.includes('browser-secret') || output().textContent.includes('count')) {
      throw new Error('The search shows signals without matching names.');
    }
    searchFor('user');
    await waitFor(() => output()?.textContent.includes('"name": "Ada"'), 'the parent group');
    searchFor('browser-secret');
    await waitFor(() => visible(noMatches()) && output().hidden, 'no matching names');
    if (!status().hidden || output().textContent) throw new Error('The search shows old values.');
    searchFor('COUNT');
    await waitFor(() => output()?.textContent.includes('count: 2'), 'the count search result');
    window.datastar.root.count = 3;
    await waitFor(() => JSON.parse(probe().textContent).count === 3, 'the updated projection');
    await waitFor(() => output()?.textContent.includes('count: 3'), 'the updated filtered view');
    if (search().value !== 'COUNT' || !noMatches().hidden) throw new Error('The search lost its filter.');
    searchFor('enabled');
    await waitFor(() => output()?.textContent.includes('enabled: false'), 'the enabled search result');
    document.querySelector('#change-enabled').click();
    await waitFor(() => JSON.parse(probe().textContent).enabled === true, 'the enabled signal change');
    await waitFor(() => output()?.textContent.includes('enabled: true'), 'the updated enabled result');
    searchFor('');
    await waitFor(() => output()?.textContent.includes('browser-secret'), 'the full view after search');
    searchFor('secret');
    await waitFor(() => output()?.textContent.includes('secret: "browser-secret"'), 'the filtered secret');
    const projection = collector();
    projection.removeAttribute('data-json-signals__terse');
    projection.textContent = '';
    await waitFor(() => visible(status()) && status().textContent.toLowerCase().includes('unavailable'), 'the unavailable status');
    if (output()?.textContent || !noMatches().hidden) {
      throw new Error('The view shows old results after an empty projection.');
    }
    searchFor('absent');
    if (!visible(status()) || !noMatches().hidden) throw new Error('The search replaced unavailable status.');
    document.body.dataset.browserResult = JSON.stringify({ok: true});
  } catch (error) {
    document.body.dataset.browserResult = JSON.stringify({ok: false, error: String(error)});
  }
</script>
</body></html>`;

async function chromePath() {
  const paths = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const path of paths) {
    try {
      await access(path);
      return path;
    } catch {
      // Try the next browser path.
    }
  }
  throw new Error("Set CHROME_PATH to a Chrome or Chromium executable.");
}

function runChrome(executable, url) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--virtual-time-budget=9000",
      "--dump-dom",
      url,
    ]);
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (text) => { stdout += text; });
    child.stderr.setEncoding("utf8").on("data", (text) => { stderr += text; });
    const timeout = setTimeout(() => child.kill(), 30000);
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) reject(new Error(`Chrome exited with ${code}: ${stderr.slice(-2000)}`));
      else resolve(stdout);
    });
  });
}

test("full Datastar 1.0.4 shows live raw signals and clears an empty projection", async () => {
  const server = createServer(async (request, response) => {
    const files = {
      "/datastar.js": [bundle, "text/javascript"],
      "/signal-view.js": [join(staticDir, "signal-view.js"), "text/javascript"],
      "/signal-collector.js": [join(staticDir, "signal-collector.js"), "text/javascript"],
      "/signal-filter.js": [join(staticDir, "signal-filter.js"), "text/javascript"],
      "/signal-view.css": [join(staticDir, "signal-view.css"), "text/css"],
      "/img/django-datastar-icon.svg": [join(staticDir, "img/django-datastar-icon.svg"), "image/svg+xml"],
    };
    const entry = files[request.url];
    if (request.url === "/") {
      response.writeHead(200, { "Content-Type": "text/html" }).end(page);
    } else if (entry) {
      try {
        const body = Buffer.isBuffer(entry[0]) ? entry[0] : await readFile(entry[0]);
        response.writeHead(200, { "Content-Type": entry[1] }).end(body);
      } catch {
        response.writeHead(404).end();
      }
    } else {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const html = await runChrome(await chromePath(), `http://127.0.0.1:${server.address().port}/`);
    const result = html.match(/data-browser-result="([^"]+)"/);
    assert.ok(result, "The browser did not finish the signal test.");
    const report = JSON.parse(result[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
    assert.deepEqual(report, { ok: true }, report.error);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
