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
<html lang="en" data-signals="{count: 2, user: {name: 'Ada'}, secret: 'browser-secret'}">
<head><meta charset="utf-8"><title>Signal test</title>
<script type="module" src="/datastar.js"></script>
<link rel="stylesheet" href="/signal-view.css">
</head>
<body>
<pre id="bundle-probe" hidden data-json-signals__terse></pre>
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
  const visible = (element) => element && getComputedStyle(element).display !== 'none' && !element.hidden;
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
    if (!output().textContent.includes('Ada') || !output().textContent.includes('2')) {
      throw new Error('The view does not show raw signal values.');
    }
    window.datastar.root.count = 3;
    await waitFor(() => JSON.parse(probe().textContent).count === 3, 'the updated projection');
    await waitFor(() => output()?.textContent.includes('3'), 'the updated view');
    const projection = collector();
    projection.removeAttribute('data-json-signals__terse');
    projection.textContent = '';
    await waitFor(() => visible(status()) && status().textContent.toLowerCase().includes('unavailable'), 'the unavailable status');
    if (output()?.textContent.includes('browser-secret') || output()?.textContent.includes('3')) {
      throw new Error('The view shows old values after an empty projection.');
    }
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
