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
  throw new Error("La variable BOT_TOKEN manque dans Render.");
}

if (!/^[A-Za-z0-9_-]{1,256}$/.test(SECRET)) {
  throw new Error(
    "WEBHOOK_SECRET doit contenir entre 1 et 256 caractères : lettres, chiffres, tirets ou underscores."
  );
}

if (!BASE_URL || new URL(BASE_URL).protocol !== "https:") {
  throw new Error("RENDER_EXTERNAL_URL doit être une URL HTTPS.");
}

// Noms exacts des fichiers présents sur ton GitHub.
const IMAGE_NAME = "accueil.jpg.PNG";
const IMAGE_PATH = path.join(__dirname, IMAGE_NAME);

if (!fs.existsSync(IMAGE_PATH)) {
  throw new Error("Le fichier accueil.jpg.PNG manque à côté de index.js.");
}

const IMAGE = fs.readFileSync(IMAGE_PATH);

const ASSETS = {
  "/vignette-1": {
    file: "weed.jpeg.PNG",
    type: "image/png"
  },
  "/vignette-2": {
    file: "hash.jpeg.PNG",
    type: "image/png"
  }
};

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
      line-height: 1.6;
    }

    main {
      width: 100%;
      max-width: 650px;
      margin: 0 auto;
      padding: 28px 18px 40px;
    }

    h1 {
      margin: 0 0 28px;
      color: #f5c542;
      font-size: clamp(26px, 6vw, 34px);
      text-align: center;
    }

    .vignettes {
      display: grid;
      gap: 18px;
    }

    .vignette {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      border: 1px solid #333;
      border-radius: 12px;
      background: #111;
      color: #fff;
      text-decoration: none;
    }

    .vignette img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }

    .vignette:active {
      transform: scale(0.98);
    }

    .vignette:focus-visible,
    .retour:focus-visible {
      outline: 3px solid #f5c542;
      outline-offset: 4px;
    }

    .retour {
      display: inline-block;
      margin-bottom: 28px;
      padding: 10px 18px;
      border: 1px solid #444;
      border-radius: 10px;
      background: #111;
      color: #fff;
      text-decoration: none;
    }

    .description {
      text-align: center;
      color: #ddd;
    }

    .erreur-image {
      padding: 20px;
      color: #f5c542;
      text-align: center;
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
        <a
          class="vignette"
          href="#informations"
          aria-label="Ouvrir la présentation WEED"
        >
          <img src="/vignette-1" alt="WEED">
          <p class="erreur-image" hidden>
            Image indisponible : weed.jpeg.PNG
          </p>
        </a>

        <a
          class="vignette"
          href="#actualites"
          aria-label="Ouvrir la présentation HASH"
        >
          <img src="/vignette-2" alt="HASH">
          <p class="erreur-image" hidden>
            Image indisponible : hash.jpeg.PNG
          </p>
        </a>
      </div>
    </section>

    <section id="informations" hidden>
      <a class="retour" href="#accueil">← Retour</a>
      <h1>WEED</h1>
      <p class="description">
        Espace de présentation et d’information.
      </p>
    </section>

    <section id="actualites" hidden>
      <a class="retour" href="#accueil">← Retour</a>
      <h1>HASH</h1>
      <p class="description">
        Espace de présentation et d’information.
      </p>
    </section>
  </main>

  <script>
    const pages = ["accueil", "informations", "actualites"];

    function afficherPage() {
      const destination = window.location.hash.slice(1);
      const active = pages.includes(destination)
        ? destination
        : "accueil";

      pages.forEach(function (id) {
        document.getElementById(id).hidden = id !== active;
      });

      window.scrollTo(0, 0);
    }

    document.querySelectorAll(".vignette img").forEach(function (img) {
      function afficherErreur() {
        img.hidden = true;
        img.nextElementSibling.hidden = false;
      }

      img.addEventListener("error", afficherErreur);

      if (img.complete && img.naturalWidth === 0) {
        afficherErreur();
      }
    });

    window.addEventListener("hashchange", afficherPage);
    afficherPage();
  </script>
</body>
</html>`;

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
      `${method} : ${data.description || "Erreur Telegram."}`
    );
  }

  return data.result;
}

function logError(error) {
  const message = String(error?.message || error);
  console.error(message.split(TOKEN).join("[TOKEN MASQUÉ]"));
}

let photoId;

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
  photoId = message.photo?.at(-1)?.file_id;
}

async function handleRequest(req, res) {
  const pathname = new URL(req.url, "http://localhost").pathname;

  if (
    req.method === "GET" &&
    Object.prototype.hasOwnProperty.call(ASSETS, pathname)
  ) {
    const asset = ASSETS[pathname];

    try {
      const buffer = await fs.promises.readFile(
        path.join(__dirname, asset.file)
      );

      res.writeHead(200, {
        "Content-Type": asset.type,
        "Cache-Control": "no-store"
      });

      res.end(buffer);
    } catch {
      console.error(`Image introuvable ou illisible : ${asset.file}`);

      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      });

      res.end(`Image introuvable : ${asset.file}`);
    }

    return;
  }

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

  if (req.headers["x-telegram-bot-api-secret-token"] !== SECRET) {
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
    update = JSON.parse(Buffer.concat(chunks).toString("utf8"));
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

  if (message?.chat?.type === "private" && command === "/start") {
    await sendWelcome(message.chat.id);
  }

  res.writeHead(200);
  res.end("OK");
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
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
