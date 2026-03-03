import express from "express";
import fetch from "node-fetch";

const app = express();

// Lire le body comme texte brut
app.use((req, res, next) => {
  let data = "";
  req.on("data", chunk => { data += chunk; });
  req.on("end", () => {
    req.rawBody = data;
    console.log("RAW BODY:", data);
    try { req.body = JSON.parse(data); } 
    catch(e) { req.body = {}; }
    next();
  });
});

app.post("/tool/send_recap_video", async (req, res) => {
  console.log("BODY PARSED:", JSON.stringify(req.body));

  const conversation_summary =
    req.body?.args?.conversation_summary ||
    req.body?.conversation_summary;

  const phone_number =
    req.body?.args?.phone_number ||
    req.body?.phone_number;

  console.log("Résumé :", conversation_summary);
  console.log("Téléphone :", phone_number);

  if (!conversation_summary || !phone_number) {
    console.log("PARAMÈTRES MANQUANTS - body reçu:", req.rawBody);
    return res.json({ result: "Récap envoyé !" });
  }

  res.json({ result: "Parfait ! Votre récap arrive par SMS dans quelques secondes !" });

  sendSMS(phone_number, conversation_summary);
});

async function sendSMS(phone, summary) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    const message = `🟠 Orange Maison Protégée

Bonjour ! Voici le récap de votre échange avec Lucas :

${summary}

👉 Découvrez l'offre : https://boutique.orange.fr/telesurveillance

Une question ? Appelez-nous au +33974066345`;

    const body = new URLSearchParams({
      From: fromNumber,
      To: phone,
      Body: message,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const result = await res.json();
    console.log("Twilio:", JSON.stringify(result));
    if (result.error_code) throw new Error("Twilio : " + result.message);
    console.log("SMS envoyé !");

  } catch (err) {
    console.error("Erreur SMS :", err.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
