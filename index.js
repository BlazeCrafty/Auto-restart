const https = require("https");
const dns = require("dns");

const SERVER_SUBDOMAIN = "blazecraftsmpgg.falixsrv.me";
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function log(msg) {
  const now = new Date().toISOString();
  console.log(`[${now}] ${msg}`);
}

function isServerOnline() {
  return new Promise((resolve) => {
    dns.lookup(SERVER_SUBDOMAIN, (err) => {
      if (err) {
        resolve(false);
        return;
      }
      // Try a TCP connection on port 25565
      const net = require("net");
      const socket = new net.Socket();
      socket.setTimeout(5000);
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("error", () => {
        socket.destroy();
        resolve(false);
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(25565, SERVER_SUBDOMAIN);
    });
  });
}

function startServer() {
  return new Promise((resolve) => {
    const url = `https://falixnodes.net/api/server/start?ip=${SERVER_SUBDOMAIN}`;
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    };

    // Try the external start API endpoint
    const req = https.request(
      `https://falixnodes.net/server/start`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
          Referer: "https://falixnodes.net/startserver",
          Origin: "https://falixnodes.net",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          log(`Start response [${res.statusCode}]: ${data.substring(0, 200)}`);
          resolve(res.statusCode);
        });
      }
    );

    req.on("error", (e) => {
      log(`Start request error: ${e.message}`);
      resolve(null);
    });

    req.write(`ip=${SERVER_SUBDOMAIN}`);
    req.end();
  });
}

async function checkAndRestart() {
  log("Checking if server is online...");
  const online = await isServerOnline();

  if (online) {
    log(`✅ Server is ONLINE — no action needed.`);
  } else {
    log(`❌ Server is OFFLINE — attempting to start...`);
    await startServer();
    log(`🚀 Start request sent to FalixNodes!`);
  }
}

// Run immediately on start
checkAndRestart();

// Then run every 5 minutes
setInterval(checkAndRestart, CHECK_INTERVAL_MS);

log(`🔄 Auto-restart watcher started for ${SERVER_SUBDOMAIN}`);
log(`⏱️  Checking every 5 minutes...`);
