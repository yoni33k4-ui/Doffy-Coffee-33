
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

// ========================================
// CONFIGURATION
// ========================================

const TOKEN = (process.env.BOT_TOKEN || "").trim();

const BASE_URL = (process.env.BASE_URL || "")
  .trim()
  .replace(/\/$/, "");

const WEBHOOK_SECRET = (
  process.env.WEBHOOK_SECRET || ""
).trim();

const ADMIN_ID = String(
  process.env.ADMIN_ID || ""
).trim();

const PORT = Number(process.env.PORT || 3000);

const CATALOGUE_URL =
  "https://screenshot-perfect-7051.lovable.app";

const ADMIN_URL =
  "https://screenshot-perfect-7051.lovable.app/admin";

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

// ========================================
// VALIDATION CONFIGURATION
// ========================================

function verifierConfiguration() {
  const manquantes = [];

  if (!TOKEN) manquantes.push("BOT_TOKEN");
  if (!BASE_URL) manquantes.push("BASE_URL");
  if (!WEBHOOK_SECRET) {
    manquantes.push("WEBHOOK_SECRET");
  }
  if (!ADMIN_ID) manquantes.push("ADMIN_ID");

  if (manquantes.length) {
    console.error(
      "Variables manquantes :",
      manquantes.join(", ")
    );
    return false;
  }

  if (!/^https:\/\//.test(BASE_URL)) {
    console.error("BASE_URL doit utiliser HTTPS");
    return false;
  }

  if (
    !/^[A-Za-z0-9_-]{1,256}$/.test(WEBHOOK_SECRET)
  ) {
    console.error(
      "WEBHOOK_SECRET contient des caractères invalides"
    );
    return false;
  }

  return true;
}

// ========================================
// SÉCURITÉ ANTI-SPAM
// ========================================

const rateLimits = new Map();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 12;
const MIN_INTERVAL_MS = 1200;

function antiSpam(userId) {
  const now = Date.now();
  const key = String(userId);

  let entry = rateLimits.get(key);

  if (!entry || now - entry.start >= WINDOW_MS) {
    entry = {
      start: now,
      count: 0,
      last: 0
    };
  }

  if (now - entry.last < MIN_INTERVAL_MS) {
    return false;
  }

  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  entry.last = now;

  rateLimits.set(key, entry);

  return true;
}

setInterval(() => {
  const now = Date.now();

  for (const [id, entry] of rateLimits) {
    if (now - entry.start > WINDOW_MS * 2) {
      rateLimits.delete(id);
    }
  }
}, 5 * 60 * 1000).unref();

function estAdmin(userId) {
  return (
    Boolean(ADMIN_ID) &&
    String(userId) === ADMIN_ID
  );
}

// ========================================
// PROTECTION WEBHOOK
// ========================================

function webhookAutorise(req) {
  if (!WEBHOOK_SECRET) return false;

  const received =
    req.get("X-Telegram-Bot-Api-Secret-Token") || "";

  const a = Buffer.from(received);
  const b = Buffer.from(WEBHOOK_SECRET);

  return (
    a.length === b.length &&
    crypto.timingSafeEqual(a, b)
  );
}

// ========================================
// API TELEGRAM
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
      `${method}: ${result.description || "Erreur API"}`
    );
  }

  return result;
}

// ========================================
// MESSAGE DE BIENVENUE
// ========================================

const TEXTE = `
🏴‍☠️ <b>DOFFY COFFEE 33</b> 🏴‍☠️
━━━━━━━━━━━━━━━━━━

🔥 <b>LE GRAND RETOUR DE DOFFY !</b>

Doffy revient de loin avec de la nouveauté sur Telegram 🏴‍☠️

✨ Une nouvelle expérience
🚀 Une mini-app nouvelle génération
💎 Un catalogue entièrement repensé
📲 Un accès rapide à nos services

━━━━━━━━━━━━━━━━━━

🏪 <b>BIENVENUE DANS NOTRE UNIVERS</b>

Découvre notre catalogue et navigue facilement grâce au menu.

🔐 Connexion via Telegram
⭐ Avis et retours
📞 Contact direct
📢 Actualités du canal

━━━━━━━━━━━━━━━━━━

👇 <b>CHOISIS TON ESPACE</b>

🏴‍☠️ <i>L'aventure continue !</i>
`.trim();

// ========================================
// BOUTONS ACCUEIL
// ========================================

function boutonsAccueil(admin = false) {
  const rows = [
    [
      {
        text: "🏪 OUVRIR LE CATALOGUE",
        web_app: {
          url: CATALOGUE_URL
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
        text: "🏠 Accueil",
        callback_data: "accueil"
      }
    ]
  ];

  if (admin) {
    rows.push([
      {
        text: "🔐 Administration",
        web_app: {
          url: ADMIN_URL
        }
      }
    ]);
  }

  return {
    inline_keyboard: rows
  };
}

// ========================================
// ACCUEIL PHOTO + TEXTE + BOUTONS
// ========================================

async function envoyerAccueil(chatId, userId) {
  const boutons = boutonsAccueil(estAdmin(userId));

  if (fs.existsSync(PHOTO_PATH)) {
    try {
      const image = await fs.promises.readFile(
        PHOTO_PATH
      );

      const form = new FormData();

      form.append("chat_id", String(chatId));
      form.append("caption", TEXTE);
      form.append("parse_mode", "HTML");

      form.append(
        "reply_markup",
        JSON.stringify(boutons)
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

      console.log(
        "Accueil avec photo envoyé :",
        chatId
      );

      return;
    } catch (error) {
      console.error(
        "Erreur envoi photo :",
        error.message
      );
    }
  } else {
    console.warn(
      "Photo introuvable :",
      PHOTO_NAME
    );
  }

  // Secours : accueil sans photo
  await telegram("sendMessage", {
    chat_id: chatId,
    text: TEXTE,
    parse_mode: "HTML",
    reply_markup: boutons,
    link_preview_options: {
      is_disabled: true
    }
  });

  console.log(
    "Accueil texte envoyé :",
    chatId
  );
}

// ========================================
// ADMINISTRATION
// ========================================

async function envoyerAdmin(chatId, userId) {
  if (!estAdmin(userId)) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: "⛔ Accès non autorisé."
    });
    return;
  }

  await telegram("sendMessage", {
    chat_id: chatId,
    text:
      "🔐 <b>ADMINISTRATION DOFFY COFFEE</b>\n\n" +
      "Accède à ton espace de gestion.",
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "⚙️ Ouvrir l'administration",
            web_app: {
              url: ADMIN_URL
            }
          }
        ],
        [
          {
            text: "🏠 Accueil",
            callback_data: "accueil"
          }
        ]
      ]
    }
  });
}

// ========================================
// AIDE
// ========================================

async function envoyerAide(chatId, userId) {
  let texte =
    "🏴‍☠️ <b>DOFFY COFFEE 33</b>\n\n" +
    "🏠 /start — Accueil\n" +
    "🏠 /accueil — Menu principal\n" +
    "❓ /aide — Aide\n" +
    "📡 /statut — État du bot\n";

  if (estAdmin(userId)) {
    texte += "🔐 /admin — Administration\n";
  }

  await telegram("sendMessage", {
    chat_id: chatId,
    text: texte,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🏠 Accueil",
            callback_data: "accueil"
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
      "🤖 Bot opérationnel\n" +
      "🔐 Webhook protégé\n" +
      "🛡️ Limitation anti-spam active\n" +
      "🏠 /start pour revenir au menu"
  });
}

// ========================================
// TRAITEMENT DES MESSAGES
// ========================================

async function traiterUpdate(update) {
  if (update.callback_query) {
    const callback = update.callback_query;

    const userId = callback.from?.id;
    const chatId = callback.message?.chat?.id;

    await telegram("answerCallbackQuery", {
      callback_query_id: callback.id
    });

    if (!chatId || !userId) return;
    if (!antiSpam(userId)) return;

    if (callback.data === "accueil") {
      await envoyerAccueil(chatId, userId);
    }

    return;
  }

  const message = update.message;

  if (!message?.text) return;

  const userId = message.from?.id;
  const chatId = message.chat?.id;

  if (!userId || !chatId) return;

  const commande = message.text
    .trim()
    .split(/\s+/)[0]
    .split("@")[0]
    .toLowerCase();

  // Le premier /start est prioritaire
  if (commande === "/start") {
    console.log(
      "Commande /start reçue :",
      chatId
    );

    await envoyerAccueil(chatId, userId);
    return;
  }

  if (!antiSpam(userId)) return;

  switch (commande) {
    case "/accueil":
      await envoyerAccueil(chatId, userId);
      break;

    case "/admin":
      await envoyerAdmin(chatId, userId);
      break;

    case "/aide":
    case "/help":
      await envoyerAide(chatId, userId);
      break;

    case "/statut":
      await envoyerStatut(chatId);
      break;

    default:
      break;
  }
}

// ========================================
// WEBHOOK TELEGRAM
// ========================================

app.post("/webhook", (req, res) => {
  if (!webhookAutorise(req)) {
    console.warn(
      "Requête webhook non autorisée"
    );
    return res.sendStatus(403);
  }

  res.sendStatus(200);

  traiterUpdate(req.body).catch(error => {
    console.error(
      "Erreur traitement update :",
      error.message
    );
  });
});

// ========================================
// CONFIGURATION TELEGRAM
// ========================================

async function configurerTelegram() {
  const info = await telegram("getMe");

  console.log(
    `Bot connecté : @${info.result.username}`
  );

  // Configurer le webhook avant les commandes
  const webhook = await telegram("setWebhook", {
    url: `${BASE_URL}/webhook`,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: [
      "message",
      "callback_query"
    ],
    drop_pending_updates: false
  });

  console.log(
    "Webhook configuré :",
    webhook.result
  );

  // Commandes publiques
  try {
    await telegram("setMyCommands", {
      commands: [
        {
          command: "start",
          description: "Accueil"
        },
        {
          command: "accueil",
          description: "Menu principal"
        },
        {
          command: "aide",
          description: "Aide"
        },
        {
          command: "statut",
          description: "Etat du bot"
        }
      ]
    });
  } catch (error) {
    console.error(
      "Erreur commandes publiques :",
      error.message
    );
  }

  // Commandes administrateur
  if (ADMIN_ID) {
    try {
      await telegram("setMyCommands", {
        scope: {
          type: "chat",
          chat_id: Number(ADMIN_ID)
        },
        commands: [
          {
            command: "start",
            description: "Accueil"
          },
          {
            command: "accueil",
            description: "Menu principal"
          },
          {
            command: "admin",
            description: "Administration"
          },
          {
            command: "aide",
            description: "Aide"
          },
          {
            command: "statut",
            description: "Etat du bot"
          }
        ]
      });
    } catch (error) {
      console.error(
        "Commandes admin non configurées :",
        error.message
      );
    }
  }

  try {
    await telegram("setChatMenuButton", {
      menu_button: {
        type: "commands"
      }
    });
  } catch (error) {
    console.error(
      "Erreur menu Telegram :",
      error.message
    );
  }

  const verification = await telegram(
    "getWebhookInfo"
  );

  console.log(
    "Webhook actif :",
    verification.result.url
  );

  if (verification.result.last_error_message) {
    console.warn(
      "Dernière erreur webhook :",
      verification.result.last_error_message
    );
  }

  console.log("DOFFY COFFEE 33 PRÊT");
}

// ========================================
// SERVEUR
// ========================================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Doffy Coffee 33"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "Doffy Coffee 33"
  });
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Serveur démarré : ${PORT}`);

  if (!verifierConfiguration()) {
    return;
  }

  try {
    await configurerTelegram();
  } catch (error) {
    console.error(
      "Erreur configuration Telegram :",
      error.message
    );
  }
});

