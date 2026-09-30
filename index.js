const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const TOKEN = process.env.BOT_TOKEN;
const SECRET = process.env.WEBHOOK_SECRET;
const BASE_URL = process.env.RENDER_EXTERNAL_URL;

if (!TOKEN || !SECRET || !BASE_URL) {
  console.error(
    "Configuration manquante : BOT_TOKEN, WEBHOOK_SECRET ou RENDER_EXTERNAL_URL."
  );
  process.exit(1);
}

// Nom exact de ton image dans GitHub
const IMAGE_NAME = "accueil.jpg.PNG";
const imagePath = path.join(__dirname, IMAGE_NAME);

if (!fs.existsSync(imagePath)) {
  console.error(`Image introuvable : ${IMAGE_NAME}`);
  process.exit(1);
}

const image = fs.readFileSync(imagePath);
let photoId = null;

async function telegram(method, data = {}) {
  const multipart = data instanceof FormData;

  const response = await fetch(
    `https://api.telegram.org/bot${TOKEN}/${method}`,
    {
      method: "POST",
      ...(multipart
        ? {
            body: data
          }
        : {
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
          }),
      signal: AbortSignal.timeout(45000)
    }
  );

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.description || "Erreur Telegram");
  }

  return result.result;
}

// Texte affiché sous l’image
const accueil = `⛰️⭐️BIENVENUE CHEZ DOFFY COFFEE 33⭐️⛰️

🏪 Doffy Coffee 33 est enfin disponible sur Telegram ! 🏪🔥

💎 Premium quality : ✅
📦 Livraison : ✅
📍 En main propre : ✅
📞 Service Client : Une équipe réactive et à l’écoute ✅

👇 Accède au menu en cliquant sur le bouton boutique 📲

⚠️ Important : Appuie sur /start pour actualiser le menu et profiter pleinement des dernières mises à jour de la mini-app.`;

// Les liens sont lus dans les variables Render
function bouton(text, variable, miniApp = false) {
  const url = (process.env[variable] || "").trim();

  if (!url) {
    return {
      text,
      callback_data: "lien_manquant"
    };
  }

  if (miniApp) {
    return {
      text,
      web_app: { url }
    };
  }

  return {
    text,
    url
  };
}

function clavier() {
  return {
    inline_keyboard: [
      [
        bouton("✈️ Tato Talk", "TATO_URL")
      ],
      [
        bouton("⭐ Avis", "AVIS_URL"),
        bouton("📞 Contact", "CONTACT_URL")
      ],
      [
        bouton("📢 New Canal", "CANAL_URL"),
        bouton("🟢 WhatsApp", "WHATSAPP_URL")
      ],
      [
        bouton("🏪 Boutique 🥼", "BOUTIQUE_URL", true)
      ]
    ]
  };
}

// Un seul envoi : photo + texte + boutons
async function envoyerAccueil(chatId) {
  const replyMarkup = clavier();

  // Réutilise la photo déjà enregistrée chez Telegram
  if (photoId) {
    await telegram("sendPhoto", {
      chat_id: chatId,
      photo: photoId,
      caption: accueil,
      reply_markup: replyMarkup
    });
    return;
  }

  // Premier envoi : téléverse l’image depuis le dépôt
  const form = new FormData();

  form.append("chat_id", String(chatId));
  form.append(
    "photo",
    new Blob([image], { type: "image/png" }),
    IMAGE_NAME
  );
  form.append("caption", accueil);
  form.append(
    "reply_markup",
    JSON.stringify(replyMarkup)
  );

  const message = await telegram("sendPhoto", form);

  if (message.photo && message.photo.length > 0) {
    photoId = message.photo.at(-1).file_id;
  }
}

async function traiter(update) {
  if (update.callback_query) {
    await telegram("answerCallbackQuery", {
      callback_query_id: update.callback_query.id,
      text: "Ce lien n’est pas encore configuré.",
      show_alert: true
    });
    return;
  }

  const message = update.message;

  if (!message || message.chat.type !== "private") {
    return;
  }

  const commandeStart =
    /^\/start(?:@\w+)?(?:\s|$)/.test(message.text || "");

  if (commandeStart) {
    await envoyerAccueil(message.chat.id);
  }
}

// Serveur nécessaire pour Render et Telegram
const server = http.createServer(async (req, res) => {
  if (req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    res.end("Serveur Doffy Coffee 33 en ligne");
    return;
  }

  if (
    req.method !== "POST" ||
    req.url !== "/telegram" ||
    req.headers["x-telegram-bot-api-secret-token"] !== SECRET
  ) {
    res.writeHead(403);
    res.end();
    return;
  }

  try {
    let body = "";

    for await (const chunk of req) {
      body += chunk;

      if (body.length > 1000000) {
        throw new Error("Requête trop grande");
      }
    }

    await traiter(JSON.parse(body));

    res.writeHead(200);
    res.end("OK");
  } catch (error) {
    console.error("Erreur :", error.message);
    res.writeHead(500);
    res.end();
  }
});

server.listen(
  process.env.PORT || 3000,
  "0.0.0.0",
  async () => {
    try {
      const bot = await telegram("getMe");

      console.log(`Bot connecté : @${bot.username}`);

      await telegram("setWebhook", {
        url: `${BASE_URL.replace(/\/$/, "")}/telegram`,
        secret_token: SECRET,
        allowed_updates: [
          "message",
          "callback_query"
        ]
      });

      console.log("Accueil avec image prêt.");
    } catch (error) {
      console.error("Erreur de connexion :", error.message);
      process.exit(1);
    }
  }
);
