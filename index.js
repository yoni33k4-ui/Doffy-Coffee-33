const http = require("node:http");

const TOKEN = process.env.BOT_TOKEN;
const SECRET = process.env.WEBHOOK_SECRET;
const BASE_URL = process.env.RENDER_EXTERNAL_URL;

if (!TOKEN || !SECRET || !BASE_URL) {
  console.error("Configuration Render incomplète.");
  process.exit(1);
}

async function telegram(method, data = {}) {
  const response = await fetch(
    `https://api.telegram.org/bot${TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(15000)
    }
  );

  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.description || "Erreur Telegram");
  }
  return result.result;
}

const accueil = `⛰️⭐️BIENVENUE CHEZ DOFFY COFFEE 33⭐️⛰️

🏪 Doffy Coffee 33 est enfin disponible sur Telegram ! 🏪🔥

💎 Premium quality : ✅
📦 Livraison : ✅
📍 En main propre : ✅
📞 Service Client : Une équipe réactive et à l’écoute ✅

👇 Accède au menu en cliquant sur le bouton boutique 📲

⚠️ Important : Appuie sur /start pour actualiser le menu et profiter des dernières mises à jour de la mini-app.`;

function bouton(text, variable, miniApp = false) {
  const url = process.env[variable];

  if (!url) {
    return { text, callback_data: "lien_manquant" };
  }

  return miniApp
    ? { text, web_app: { url } }
    : { text, url };
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
  if (!message || message.chat.type !== "private") return;
  if (!/^\/start(?:@\w+)?(?:\s|$)/.test(message.text || "")) return;

  if (process.env.PHOTO_URL) {
    try {
      await telegram("sendPhoto", {
        chat_id: message.chat.id,
        photo: process.env.PHOTO_URL,
        caption: "⭐ Doffy Coffee 33 ⭐"
      });
    } catch (error) {
      console.error("Photo :", error.message);
    }
  }

  await telegram("sendMessage", {
    chat_id: message.chat.id,
    text: accueil,
    reply_markup: {
      inline_keyboard: [
        [bouton("✈️ Tato Talk", "TATO_URL")],
        [
          bouton("⭐ Avis", "AVIS_URL"),
          bouton("📞 Contact", "CONTACT_URL")
        ],
        [
          bouton("📢 New Canal", "CANAL_URL"),
          bouton("🟢 WhatsApp", "WHATSAPP_URL")
        ],
        [bouton("🏪 Boutique 🥼", "BOUTIQUE_URL", true)]
      ]
    }
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET") {
    res.writeHead(200);
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
      if (body.length > 1000000) throw new Error("Requête trop grande");
    }

    await traiter(JSON.parse(body));
    res.writeHead(200);
    res.end("OK");
  } catch (error) {
    console.error(error.message);
    res.writeHead(500);
    res.end();
  }
});

server.listen(process.env.PORT || 3000, "0.0.0.0", async () => {
  try {
    const bot = await telegram("getMe");
    console.log(`Bot connecté : @${bot.username}`);

    await telegram("setWebhook", {
      url: `${BASE_URL.replace(/\/$/, "")}/telegram`,
      secret_token: SECRET,
      allowed_updates: ["message", "callback_query"]
    });

    console.log("Connexion Telegram configurée.");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
});
