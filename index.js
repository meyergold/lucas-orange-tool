import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/tool/send_recap_video", async (req, res) => {
  console.log("BODY:", JSON.stringify(req.body));

  let conversation_summary, phone_number;

  try {
    const raw = req.body?.toString();
    const parsed = JSON.parse(raw);
    conversation_summary = parsed?.args?.conversation_summary || parsed?.conversation_summary;
    phone_number = parsed?.args?.phone_number || parsed?.phone_number;
  } catch(e) {
    conversation_summary = req.body?.args?.conversation_summary || req.body?.conversation_summary;
    phone_number = req.body?.args?.phone_number || req.body?.phone_number;
  }

  console.log("Résumé :", conversation_summary);
  console.log("Téléphone :", phone_number);

  if (!conversation_summary || !phone_number) {
    return res.json({ result: "Erreur : paramètres manquants" });
  }

  res.json({ result: "Parfait ! Votre récap sera envoyé par SMS dans quelques secondes !" });

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
