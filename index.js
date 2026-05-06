const { firefox } = require("playwright");
const net = require("net");

const SERVER = "blazecraftsmpgg.falixsrv.me";
const PORT = 25565;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const START_URL = "https://falixnodes.net/startserver";

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function isServerOnline() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(8000);
    socket.on("connect", () => { socket.destroy(); resolve(true); });
    socket.on("error", () => { socket.destroy(); resolve(false); });
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
    socket.connect(PORT, SERVER);
  });
}

async function startServer() {
  let browser;
  try {
    log("🌐 Launching stealth browser...");
    browser = await firefox.launch({
      headless: true,
      firefoxUserPrefs: {
        "general.useragent.override": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
        "media.peerconnection.enabled": false,
        "privacy.resistFingerprinting": false,
        "dom.webdriver.enabled": false,
        "useAutomationExtension": false,
      }
    });

    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
      locale: "en-US",
      timezoneId: "Europe/Paris",
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      hasTouch: false,
      javaScriptEnabled: true,
    });

    // Hide webdriver flag
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
      window.chrome = { runtime: {} };
    });

    const page = await context.newPage();

    log(`📄 Opening ${START_URL}`);
    await page.goto(START_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Wait for Cloudflare to pass
    log("⏳ Waiting for Cloudflare verification...");
    await page.waitForTimeout(10000);

    // Remove cookie popup
    try {
      await page.evaluate(() => {
        const cmp = document.getElementById('snigel-cmp-framework');
        if (cmp) cmp.remove();
      });
      log("🗑️ Removed cookie framework");
    } catch (e) {}

    await page.waitForTimeout(1000);

    // Type server address
    try {
      const input = page.locator('input').first();
      await input.waitFor({ timeout: 5000 });
      await input.fill(SERVER);
      log(`⌨️ Typed: ${SERVER}`);
    } catch (e) {
      log(`⚠️ Input field issue: ${e.message}`);
    }

    await page.waitForTimeout(1000);

    // Click start button
    try {
      const btn = page.locator('button:has-text("Start"), button:has-text("Démarrer")').first();
      await btn.click({ force: true });
      log("✅ Clicked start button!");
      await page.waitForTimeout(8000);
      const text = await page.innerText("body");
      log("Result: " + text.substring(0, 300));
    } catch (e) {
      log(`❌ Button error: ${e.message}`);
      const text = await page.innerText("body");
      log("Page: " + text.substring(0, 300));
    }

  } catch (err) {
    log(`❌ Error: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

async function checkAndRestart() {
  log("Checking if server is online...");
  const online = await isServerOnline();
  if (online) {
    log("✅ Server is ONLINE — no action needed.");
  } else {
    log("❌ Server is OFFLINE — attempting stealth start...");
    await startServer();
  }
}

checkAndRestart();
setInterval(checkAndRestart, CHECK_INTERVAL_MS);
log(`🔄 Stealth auto-restart started for ${SERVER}`);
log(`⏱️  Checking every 5 minutes...`);
