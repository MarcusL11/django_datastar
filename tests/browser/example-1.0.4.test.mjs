import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const bundle = await readFile(new URL("fixtures/datastar-1.0.4.js", import.meta.url));
assert.equal(
  createHash("sha256").update(bundle).digest("hex"),
  "727844adfc825ee651fb93c544a2a739986f9a21820a94524b35f0cac470cf91",
);
const cdn = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.4/bundles/datastar.js";
const probe = `<script type="module">
  const waitFor = async (condition, name) => {
    for (let i = 0; i < 100; i++) {
      if (condition()) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('No ' + name);
  };
  try {
    await import('/datastar.js');
    if (location.pathname === '/request-metadata/') {
      const buttons = document.querySelectorAll('.actions button');
      buttons[0].click();
      await waitFor(() => document.querySelector('#request-metadata-result')?.textContent.includes('sync'), 'sync response');
      if (!document.querySelector('#request-metadata-result').textContent.includes('True')) throw new Error('No Datastar request marker');
      buttons[1].click();
      await waitFor(() => document.querySelector('#request-metadata-result')?.textContent.includes('async'), 'async response');
    } else {
      document.querySelector('#message').value = 'Browser test';
      document.querySelector('main form button').click();
      await waitFor(() => document.querySelector('#csrf-result')?.textContent.includes('Django accepted the protected POST'), 'CSRF response');
      if (!document.querySelector('#csrf-result').textContent.includes('Browser test')) throw new Error('No POST value');
    }
    document.body.dataset.browserResult = JSON.stringify({ok: true});
  } catch (error) {
    document.body.dataset.browserResult = JSON.stringify({ok: false, error: String(error)});
  }
</script>`;

async function chromePath() {
  for (const path of [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean)) {
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
      "--virtual-time-budget=12000", "--dump-dom", url,
    ]);
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (text) => { stdout += text; });
    child.stderr.setEncoding("utf8").on("data", (text) => { stderr += text; });
    const timer = setTimeout(() => child.kill(), 30000);
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`Chrome exited with ${code}: ${stderr.slice(-1500)}`));
      else resolve(stdout);
    });
  });
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForDjango(port, child) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Django exited with ${child.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch {
      // Wait for the server.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Django did not start.");
}

test("the 1.0.4 example runs GET actions and a protected POST in Chrome", async () => {
  const port = await freePort();
  const python = process.env.EXAMPLE_PYTHON;
  const args = ["example/manage.py", "runserver", `127.0.0.1:${port}`, "--noreload"];
  const django = spawn(python ?? "uv", python ? args : ["run", "python", ...args], {
    cwd: root,
    stdio: "ignore",
  });
  let server;
  try {
    await waitForDjango(port, django);
    const requests = [];
    server = createServer(async (request, response) => {
      if (request.url === "/datastar.js") {
        response.writeHead(200, {"Content-Type": "text/javascript"}).end(bundle);
        return;
      }
      // The proxy sends Django's origin because the browser uses the proxy port.
      const target = await fetch(`http://127.0.0.1:${port}${request.url}`, {
        method: request.method,
        headers: {...request.headers, origin: request.method === "POST" ? `http://127.0.0.1:${port}` : request.headers.origin},
        body: request.method === "POST" ? request : undefined,
        duplex: "half",
        redirect: "manual",
      });
      if (request.url.startsWith("/request-metadata/") || request.url.startsWith("/csrf/submit/")) {
        requests.push({path: request.url, marker: request.headers["datastar-request"], hasToken: Boolean(request.headers["x-csrftoken"]), hasCookie: Boolean(request.headers.cookie), status: target.status});
      }
      const headers = {"Content-Type": target.headers.get("content-type") ?? "text/html"};
      const cookies = target.headers.getSetCookie();
      if (cookies.length) headers["Set-Cookie"] = cookies;
      let body = await target.text();
      if (request.url === "/request-metadata/" || request.url === "/csrf/") {
        assert.ok(body.includes(cdn), "The example did not load Datastar 1.0.4.");
        body = body.replace(cdn, "/datastar.js").replace("</body>", `${probe}</body>`);
      }
      response.writeHead(target.status, headers).end(body);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const chrome = await chromePath();
    for (const path of ["/request-metadata/", "/csrf/"]) {
      const html = await runChrome(chrome, origin + path);
      const result = html.match(/data-browser-result="([^"]+)"/);
      assert.ok(result, `The browser did not finish ${path}.`);
      const report = JSON.parse(result[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
      assert.deepEqual(report, {ok: true}, `${path}: ${report.error} ${JSON.stringify(requests)}`);
    }
    assert.equal(requests.filter(({marker}) => marker === "true").length, 3);
    assert.ok(requests.find(({path, hasToken, hasCookie, status}) =>
      path === "/csrf/submit/" && hasToken && hasCookie && status === 200,
    ));
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    django.kill();
  }
});
