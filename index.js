const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const TOKEN = process.env.BOT_TOKEN;
const SECRET = process.env.WEBHOOK_SECRET;
const BASE_URL = (
  process.env.RENDER_EXTERNAL_URL || ""
).trim().replace(/\/$/, "");

const PORT = Number(process.env.PORT || 3000);

if (!TOKEN) {
  throw new Error("BOT_TOKEN manquant dans Environment sur Render.");
}

if (!/^https:\/\//.test(BASE_URL)) {
  throw new Error("RENDER_EXTERNAL_URL doit être une URL HTTPS.");
}

if (!SECRET || !/^[A-Za-z0-9_-]{1,256}$/.test(SECRET)) {
  throw new Error(
    "WEBHOOK_SECRET manquant ou invalide : utilise lettres, chiffres, tirets ou underscores."
  );
}

// Nom exact de l’image dans GitHub.
const IMAGE_NAME = "accueil.jpg.PNG";
const IMAGE_PATH = path.join(__dirname, IMAGE_NAME);

if (!fs.existsSync(IMAGE_PATH)) {
  throw new Error(`Image introuvable : ${IMAGE_NAME}`);
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
    body {
      margin: 0;
      padding: 32px 20px;
      background: #111;
      color: #fff;
      font-family: Arial, sans-serif;
      line-height: 1.6;
      text-align: center;
    }

    main {
      max-width: 600px;
      margin: auto;
    }

    h1 {
      color: #f5c542;
    }
  </style>
</head>
<body>
  <main>
    <h1>Doffy Coffee 33</h1>
    <p>Bienvenue sur notre page d’information.</p>
    <p>Nos actualités seront publiées ici.</p>
  </main>
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
    throw new Error("La requête Telegram a échoué.");
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
      "Content-Type": "text/html; charset=utf-8"
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

  if (
    message?.chat?.type === "private" &&
    /^\/start(?:@\w+)?(?:\s|$)/i.test(message.text || "")
  ) {
    await sendWelcome(message.chat.id);
  }

  res.writeHead(200);
  res.end("OK");
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(() => {
    console.error("Erreur lors du traitement du message.");

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

    console.log("Bot d’information prêt.");
  } catch {
    console.error(
      "Échec du webhook : vérifie les variables Render."
    );

    server.close(() => process.exit(1));
  }
});
