import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

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
<html lang="en" data-signals="{count: 2, secret: 'first-value'}">
<head><meta charset="utf-8"><title>Signal lifecycle</title></head>
<body><main id="page">First page</main>
<script type="module">
  const pause = () => new Promise((resolve) => setTimeout(resolve, 50));
  const waitFor = async (condition, name) => {
    for (let i = 0; i < 100; i++) {
      if (condition()) return;
      await pause();
    }
    throw new Error('The browser did not show ' + name + '.');
  };
  const toggle = () => document.querySelector('[data-datastar-signal-toggle]');
  const view = () => document.querySelector('[data-datastar-signal-view]');
  const collector = () => document.querySelector('pre[data-json-signals__terse]');
  const output = () => document.querySelector('[data-datastar-signal-output]');
  const status = () => document.querySelector('[data-datastar-signal-status]');
  const ready = (value) => output()?.textContent.includes(value) && !output().hidden;
  const unavailable = () => !status()?.hidden && output()?.hidden && !output().textContent;
  try {
    await import('/signal-view.js');
    await waitFor(() => toggle() && collector() && unavailable(), 'the initial unavailable view');
    toggle().click();
    if (view().hidden) throw new Error('The view did not open.');

    const datastar = await import('/datastar.js');
    window.datastar = datastar;
    await waitFor(() => ready('first-value'), 'the late Datastar projection');

    const original = collector();
    original.remove();
    await waitFor(unavailable, 'unavailable after collector removal');
    if (output().textContent.includes('first-value')) {
      throw new Error('The removed collector left old values in the view.');
    }

    await waitFor(() => collector(), 'a collector after removal');
    datastar.root.count = 4;
    datastar.root.secret = 'recovered-value';
    await waitFor(() => ready('recovered-value') && !output().textContent.includes('first-value'), 'recovery after removal');

    document.body.replaceChildren(Object.assign(document.createElement('main'), {id: 'page', textContent: 'Next page'}));
    await waitFor(() => toggle() && collector(), 'the control after a page morph');
    datastar.root.secret = 'morphed-value';
    await waitFor(() => collector()?.textContent.includes('morphed-value'), 'the projection after a page morph');
    if (view().hidden) toggle().click();
    await waitFor(() => ready('morphed-value'), 'the current view after a page morph');
    if (output().textContent.includes('recovered-value')) {
      throw new Error('The page morph left old values in the view.');
    }
    document.body.dataset.browserResult = JSON.stringify({ok: true});
  } catch (error) {
    document.body.dataset.browserResult = JSON.stringify({ok: false, error: String(error)});
  }
</script></body></html>`;

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
      "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
      "--virtual-time-budget=15000", "--dump-dom", url,
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

test("full Datastar 1.0.4 keeps the view current after late load, removal, and page morph", async () => {
  const server = createServer(async (request, response) => {
    const files = {
      "/datastar.js": [bundle, "text/javascript"],
      "/signal-view.js": [join(staticDir, "signal-view.js"), "text/javascript"],
      "/signal-collector.js": [join(staticDir, "signal-collector.js"), "text/javascript"],
    };
    const entry = files[request.url];
    if (request.url === "/") {
      response.writeHead(200, {"Content-Type": "text/html"}).end(page);
    } else if (entry) {
      const content = Buffer.isBuffer(entry[0]) ? entry[0] : await readFile(entry[0]);
      response.writeHead(200, {"Content-Type": entry[1]}).end(content);
    } else {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const html = await runChrome(await chromePath(), `http://127.0.0.1:${server.address().port}/`);
    const result = html.match(/data-browser-result="([^"]+)"/);
    assert.ok(result, "The browser did not finish the lifecycle test.");
    const report = JSON.parse(result[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
    assert.deepEqual(report, {ok: true}, report.error);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
