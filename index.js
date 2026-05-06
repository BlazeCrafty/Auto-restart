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
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    });

    log(`📄 Opening ${START_URL}`);
    await page.goto(START_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

    await page.waitForTimeout(5000);

    const btn = await page.$("button[type='submit'], input[type='submit'], .start-btn, #start-btn");
    if (btn) {
      await btn.click();
      log("✅ Clicked start button!");
      await page.waitForTimeout(5000);
    } else {
      log("⚠️ Could not find start button — dumping page text...");
      const text = await page.innerText("body");
      log(text.substring(0, 500));
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
