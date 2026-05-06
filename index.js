const { chromium } = require("playwright");
const net = require("net");

const SERVER = "blazecraftsmpgg.falixsrv.me";
const PORT = 25565;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const START_URL = `https://falixnodes.net/startserver?ip=${SERVER}`;

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
    log("🌐 Launching headless browser...");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    });
    const page = await context.newPage();

    log(`📄 Opening ${START_URL}`);
    await page.goto(START_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Dismiss cookie consent popup if present
    try {
      const acceptBtn = page.locator('button:has-text("Accept"), button:has-text("agree"), button:has-text("OK"), button:has-text("Consent"), [id*="accept"], [class*="accept"]').first();
      if (await acceptBtn.isVisible({ timeout: 3000 })) {
        await acceptBtn.click({ force: true });
        log("🍪 Dismissed cookie popup");
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      log("No cookie popup found, continuing...");
    }

    // Also try clicking away the cookie framework by force
    try {
      await page.evaluate(() => {
        const cmp = document.getElementById('snigel-cmp-framework');
        if (cmp) cmp.remove();
      });
      log("🗑️ Removed cookie framework from DOM");
    } catch (e) {}

    await page.waitForTimeout(1000);

    // Now click the start button
    try {
      const startBtn = page.locator('button:has-text("Start"), button:has-text("start"), input[type="submit"], button[type="submit"]').first();
      if (await startBtn.isVisible({ timeout: 5000 })) {
        await startBtn.click({ force: true });
        log("✅ Clicked start button!");
        await page.waitForTimeout(5000);
        const bodyText = await page.innerText("body");
        log("Page says: " + bodyText.substring(0, 300));
      } else {
        log("⚠️ Start button not found");
        const bodyText = await page.innerText("body");
        log("Page content: " + bodyText.substring(0, 500));
      }
    } catch (e) {
      log(`❌ Could not click start button: ${e.message}`);
    }

  } catch (err) {
    log(`❌ Browser error: ${err.message}`);
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
    log("❌ Server is OFFLINE — launching browser to start it...");
    await startServer();
  }
}

checkAndRestart();
setInterval(checkAndRestart, CHECK_INTERVAL_MS);
log(`🔄 Auto-restart watcher started for ${SERVER}`);
log(`⏱️  Checking every 5 minutes...`);
