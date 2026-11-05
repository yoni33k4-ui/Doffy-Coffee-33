
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const app = express();
app.use(express.json({ limit: "1mb" }));

// ========================================
// CONFIGURATION
// ========================================

const TOKEN = (process.env.BOT_TOKEN || "").trim();

const BASE_URL = (
  process.env.BASE_URL || ""
).trim().replace(/\/$/, "");

const WEBHOOK_SECRET = (
  process.env.WEBHOOK_SECRET || ""
).trim();

const PORT = Number(process.env.PORT || 3000);

const PHOTO_NAME =
  "3168703F-5AD2-4B96-A901-3E86B0355FF8.png";

const PHOTO_PATH = path.join(__dirname, PHOTO_NAME);

// ========================================
// LIENS
// ========================================

const TATO_URL =
  "https://tato.im/doctorpharma33776";

const AVIS_URL =
  "https://tato.im/doctoravis33";

const NEW_CANAL_URL =
  "https://t.me/+MIB2qImNuyQ0OWY0";

const WHATSAPP_URL =
  "https://wa.me/33758106388";

const CONTACT_URL =
  "https://t.me/o_commande33k";

const BOUTIQUE_URL =
  "https://doctor-pharma-shop.lovable.app/";

// ========================================
// MESSAGE DE BIENVENUE
// ========================================

const TEXTE = `
🏴‍☠️ <b>DOFFY COFFEE 33</b> 🏴‍☠️
━━━━━━━━━━━━━━━━━━

🔥 <b>LE GRAND RETOUR DE DOFFY !</b>

Doffy revient de loin avec de la nouveauté sur Telegram 🏴‍☠️

✨ Une nouvelle expérience
🚀 Une boutique nouvelle génération
💎 Des nouveautés à découvrir
📲 Un accès rapide à tous nos services

━━━━━━━━━━━━━━━━━━

🏪 <b>BIENVENUE DANS NOTRE UNIVERS</b>

Découvre notre boutique et navigue facilement grâce aux boutons ci-dessous.

⭐ <b>Avis :</b> découvre les retours.
📞 <b>Contact :</b> contacte notre équipe.
📢 <b>Canal :</b> retrouve nos annonces.
🏠 <b>Accueil :</b> reviens au menu principal.

━━━━━━━━━━━━━━━━━━

👇 <b>CHOISIS TON ESPACE</b>

🏴‍☠️ <i>L'aventure Doffy Coffee 33 continue !</i>
`.trim();

// ========================================
// CLAVIER PRINCIPAL
// ========================================

const BOUTONS = {
  inline_keyboard: [
    [
      {
        text: "🏪 OUVRIR LA BOUTIQUE",
        web_app: {
          url: BOUTIQUE_URL
        }
      }
    ],
    [
      {
        text: "⭐ Avis",
        url: AVIS_URL
      },
      {
        text: "📞 Contact",
        url: CONTACT_URL
      }
    ],
    [
      {
        text: "📢 Notre canal",
        url: NEW_CANAL_URL
      },
      {
        text: "🟢 WhatsApp",
        url: WHATSAPP_URL
      }
    ],
    [
      {
        text: "✈️ Tato Talk",
        url: TATO_URL
      }
    ],
    [
      {
        text: "🏠 Actualiser l'accueil",
        callback_data: "accueil"
      }
    ]
  ]
};

// ========================================
// APPELS API TELEGRAM
// ========================================

async function telegram(method, body = {}) {
  if (!TOKEN) {
    throw new Error("BOT_TOKEN manquant");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${TOKEN}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    }
  );

  const result = await response.json();

  if (!result.ok) {
    throw new Error(
      `${method}: ${result.description || "Erreur Telegram"}`
    );
  }

  return result;
}

// ========================================
// PHOTO DE BIENVENUE
// ========================================

async function envoyerPhoto(chatId) {
  if (!fs.existsSync(PHOTO_PATH)) {
    console.log("Photo absente, accueil texte utilisé");
    return;
  }

  const image = await fs.promises.readFile(PHOTO_PATH);

  const form = new FormData();

  form.append("chat_id", String(chatId));

  form.append(
    "caption",
    "🏴‍☠️ DOFFY COFFEE 33 🏴‍☠️"
  );

  form.append(
    "photo",
    new Blob([image], { type: "image/png" }),
    PHOTO_NAME
  );

  const response = await fetch(
    `https://api.telegram.org/bot${TOKEN}/sendPhoto`,
    {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30000)
    }
  );

  const result = await response.json();

  if (!result.ok) {
    throw new Error(
      result.description || "Erreur photo"
    );
  }
}

// ========================================
// ACCUEIL
// ========================================

async function envoyerAccueil(chatId) {
  try {
    await envoyerPhoto(chatId);
  } catch (error) {
    console.error("Photo :", error.message);
  }

  await telegram("sendMessage", {
    chat_id: chatId,
    text: TEXTE,
    parse_mode: "HTML",
    reply_markup: BOUTONS,
    disable_web_page_preview: true
  });
}

// ========================================
// AIDE
// ========================================

async function envoyerAide(chatId) {
  await telegram("sendMessage", {
    chat_id: chatId,
    parse_mode: "HTML",
    text:
      "🏴‍☠️ <b>CENTRE D'AIDE DOFFY</b>\n\n" +
      "🏠 /start — Menu principal\n" +
      "🏠 /accueil — Retour à l'accueil\n" +
      "❓ /aide — Afficher les commandes\n" +
      "📡 /statut — État du bot\n\n" +
      "Utilise les boutons du menu pour accéder aux services.",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🏠 Accueil",
            callback_data: "accueil"
          }
        ],
        [
          {
            text: "📞 Contact",
            url: CONTACT_URL
          }
        ]
      ]
    }
  });
}

// ========================================
// STATUT
// ========================================

async function envoyerStatut(chatId) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text:
      "🟢 DOFFY COFFEE 33\n\n" +
      "🤖 Bot : opérationnel\n" +
      "📡 Connexion Telegram : active\n" +
      "🏴‍☠️ Menu disponible : /start"
  });
}

// ========================================
// SÉCURITÉ WEBHOOK
// ========================================

function webhookAutorise(req) {
  const secretRecu =
    req.get("X-Telegram-Bot-Api-Secret-Token") || "";

  if (!WEBHOOK_SECRET) return false;

  const attendu = Buffer.from(WEBHOOK_SECRET);
  const recu = Buffer.from(secretRecu);

  return (
    attendu.length === recu.length &&
    crypto.timingSafeEqual(attendu, recu)
  );
}

// ========================================
// RÉCEPTION DES MESSAGES
// ========================================

app.post("/webhook", (req, res) => {
  if (!webhookAutorise(req)) {
    return res.sendStatus(403);
  }

  const update = req.body;

  // Répondre rapidement à Telegram.
  res.sendStatus(200);

  traiterUpdate(update).catch(error => {
    console.error("Erreur update :", error.message);
  });
});

async function traiterUpdate(update) {
  // Boutons interactifs
  if (update.callback_query) {
    const callback = update.callback_query;

    await telegram("answerCallbackQuery", {
      callback_query_id: callback.id
    });

    if (
      callback.data === "accueil" &&
      callback.message?.chat?.id
    ) {
      await envoyerAccueil(callback.message.chat.id);
    }

    return;
  }

  const message = update.message;

  if (!message?.text || !message.chat?.id) {
    return;
  }

  const chatId = message.chat.id;

  const commande = message.text
    .trim()
    .split(/\s+/)[0]
    .split("@")[0]
    .toLowerCase();

  switch (commande) {
    case "/start":
    case "/accueil":
      await envoyerAccueil(chatId);
      break;

    case "/aide":
    case "/help":
      await envoyerAide(chatId);
      break;

    case "/statut":
      await envoyerStatut(chatId);
      break;

    default:
      break;
  }
}

// ========================================
// CONFIGURATION TELEGRAM
// ========================================

async function configurerTelegram() {
  const info = await telegram("getMe");

  console.log(
    `Bot connecté : @${info.result.username}`
  );

  await telegram("setMyCommands", {
    commands: [
      {
        command: "start",
        description: "🏠 Accueil Doffy Coffee"
      },
      {
        command: "accueil",
        description: "🏠 Retour au menu"
      },
      {
        command: "aide",
        description: "❓ Centre d'aide"
      },
      {
        command: "statut",
        description: "📡 État du bot"
      }
    ]
  });

  // Bouton natif en bas du chat.
  await telegram("setChatMenuButton", {
    menu_button: {
      type: "commands"
    }
  });

  await telegram("setWebhook", {
    url: `${BASE_URL}/webhook`,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: [
      "message",
      "callback_query"
    ],
    drop_pending_updates: false
  });

  console.log("Webhook configuré");
  console.log("Menu Telegram configuré");
}

// ========================================
// ROUTES SERVEUR
// ========================================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Doffy Coffee 33",
    status: "online"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true
  });
});

// ========================================
// DÉMARRAGE
// ========================================

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Serveur actif sur port ${PORT}`);

  if (!TOKEN || !BASE_URL || !WEBHOOK_SECRET) {
    console.error(
      "Configuration manquante : BOT_TOKEN, BASE_URL ou WEBHOOK_SECRET"
    );
    return;
  }

  try {
    await configurerTelegram();
    console.log("DOFFY COFFEE 33 PRÊT");
  } catch (error) {
    console.error(
      "Erreur configuration Telegram :",
      error.message
    );
  }
});
