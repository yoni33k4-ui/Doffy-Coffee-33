const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const TOKEN = (process.env.BOT_TOKEN || "").trim();
const SECRET = (process.env.WEBHOOK_SECRET || "").trim();
const BASE_URL = (process.env.RENDER_EXTERNAL_URL || "")
  .trim()
  .replace(/\/$/, "");

const PORT = Number(process.env.PORT || 3000);

if (!TOKEN) {
  throw new Error("BOT_TOKEN manquant dans Render.");
}

if (!/^[A-Za-z0-9_-]{1,256}$/.test(SECRET)) {
  throw new Error(
    "WEBHOOK_SECRET invalide : lettres, chiffres, tirets et underscores uniquement."
  );
}

try {
  if (new URL(BASE_URL).protocol !== "https:") {
    throw new Error();
  }
} catch {
  throw new Error(
    "RENDER_EXTERNAL_URL doit contenir une URL HTTPS valide."
  );
}

// Nom exact de ton image dans GitHub.
const IMAGE_NAME = "accueil.jpg.PNG";
const IMAGE_PATH = path.join(__dirname, IMAGE_NAME);

if (!fs.existsSync(IMAGE_PATH)) {
  throw new Error(
    "Image introuvable : ajoute accueil.jpg.PNG à côté de index.js."
  );
}

const IMAGE = fs.readFileSync(IMAGE_PATH);

const WELCOME = `⭐ BIENVENUE CHEZ DOFFY COFFEE 33 ⭐

Retrouve ici nos informations et nos actualités.

👇 Accède à notre page d’information en cliquant sur le bouton Mini app 📲

ℹ️ Appuie sur /start pour afficher de nouveau ce message.`;

const KEYBOARD = {
  inline_keyboard: [
    [
      {
        text: "✈️ Tato Talk",
        url: "https://tato.im/doffycoffeee33"
      }
    ],
    [
      {
        text: "📢 New Canal",
        url: "https://t.me/+eT4aDsgGE8s4ZjU0"
      }
    ],
    [
      {
        text: "📲 Mini app",
        web_app: {
          url: `${BASE_URL}/info`
        }
      }
    ]
  ]
};

const INFO_PAGE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Doffy Coffee 33</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #000;
      color: #fff;
      font-family: Arial, sans-serif;
    }

    main {
      max-width: 650px;
      margin: auto;
      padding: 28px 18px;
    }

    h1 {
      margin: 0 0 28px;
      text-align: center;
      color: #f5c542;
      font-size: 28px;
    }

    .vignettes {
      display: grid;
      gap: 18px;
    }

    .vignette {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 150px;
      padding: 20px 12px;
      border: 1px solid #333;
      border-radius: 12px;
      background: linear-gradient(135deg, #111, #000);
      color: #fff;
      text-decoration: none;
      text-align: center;
    }

    .vignette span {
      font-family: Impact, "Arial Black", sans-serif;
      font-size: clamp(26px, 7vw, 46px);
      font-weight: 900;
      font-style: italic;
      text-transform: uppercase;
    }

    .vignette:active {
      transform: scale(0.98);
    }

    a:focus-visible {
      outline: 3px solid #f5c542;
      outline-offset: 4px;
    }

    .retour {
      display: inline-block;
      margin-bottom: 28px;
      padding: 12px 18px;
      border: 1px solid #444;
      border-radius: 10px;
      color: #fff;
      text-decoration: none;
    }

    p {
      font-size: 18px;
      line-height: 1.6;
    }

    [hidden] {
      display: none !important;
    }
  </style>
</head>

<body>
  <main>
    <section id="accueil">
      <h1>Doffy Coffee 33</h1>

      <div class="vignettes">
        <a class="vignette" href="#informations">
          <span>Informations</span>
        </a>

        <a class="vignette" href="#actualites">
          <span>Actualités</span>
        </a>
      </div>
    </section>

    <section id="informations" hidden>
      <a class="retour" href="#accueil">← Retour</a>
      <h1>Informations</h1>
      <p>Bienvenue sur notre page d’information.</p>
    </section>

    <section id="actualites" hidden>
      <a class="retour" href="#accueil">← Retour</a>
      <h1>Actualités</h1>
      <p>Nos actualités seront publiées ici.</p>
    </section>
  </main>

  <script>
    const pages = ["accueil", "informations", "actualites"];

    function afficherPage() {
      const destination = location.hash.slice(1);
      const active = pages.includes(destination)
        ? destination
        : "accueil";

      pages.forEach(function(id) {
        document.getElementById(id).hidden = id !== active;
      });

      window.scrollTo(0, 0);
    }

    window.addEventListener("hashchange", afficherPage);
    afficherPage();
  </script>
</body>
</html>`;

function logError(error) {
  const message = String(error.message || error);
  console.error(message.split(TOKEN).join("[TOKEN]"));
}

async function telegram(method, body) {
  const multipart = body instanceof FormData;

  const response = await fetch(
    `https://api.telegram.org/bot${TOKEN}/${method}`,
    {
      method: "POST",
      headers: multipart
        ? undefined
        : { "Content-Type": "application/json" },
      body: multipart ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(
      `${method} : ${data.description || "Erreur Telegram"}`
    );
  }

  return data.result;
}

let photoId = null;

async function sendWelcome(chatId) {
  if (photoId) {
    await telegram("sendPhoto", {
      chat_id: chatId,
      photo: photoId,
      caption: WELCOME,
      reply_markup: KEYBOARD
    });

    return;
  }

  const form = new FormData();

  form.append("chat_id", String(chatId));
  form.append("caption", WELCOME);
  form.append("reply_markup", JSON.stringify(KEYBOARD));
  form.append(
    "photo",
    new Blob([IMAGE], { type: "image/png" }),
    IMAGE_NAME
  );

  const message = await telegram("sendPhoto", form);

  photoId = message.photo?.at(-1)?.file_id || null;
}

async function handleRequest(req, res) {
  const pathname = new URL(
    req.url,
    "http://localhost"
  ).pathname;

  if (req.method === "GET" && pathname === "/") {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("Bot d’information actif ✅");
    return;
  }

  if (req.method === "GET" && pathname === "/info") {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    });

    res.end(INFO_PAGE);
    return;
  }

  if (req.method !== "POST" || pathname !== "/telegram") {
    res.writeHead(404);
    res.end();
    return;
  }

  if (
    req.headers["x-telegram-bot-api-secret-token"] !== SECRET
  ) {
    res.writeHead(403);
    res.end();
    return;
  }

  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;

    if (size > 1024 * 1024) {
      res.writeHead(413);
      res.end();
      return;
    }

    chunks.push(chunk);
  }

  let update;

  try {
    update = JSON.parse(
      Buffer.concat(chunks).toString("utf8")
    );
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }

  const message = update.message;

  const command = (message?.text || "")
    .trim()
    .split(/\s+/)[0]
    .split("@")[0];

  if (
    message?.chat?.type === "private" &&
    command === "/start"
  ) {
    await sendWelcome(message.chat.id);
  }

  res.writeHead(200);
  res.end("OK");
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    logError(error);

    if (!res.headersSent) {
      res.writeHead(500);
    }

    res.end();
  });
});

server.listen(PORT, "0.0.0.0", async () => {
  try {
    await telegram("setWebhook", {
      url: `${BASE_URL}/telegram`,
      secret_token: SECRET,
      allowed_updates: ["message"]
    });

    console.log("Bot prêt : webhook configuré.");
  } catch (error) {
    logError(error);
    server.close(() => process.exit(1));
  }
});
