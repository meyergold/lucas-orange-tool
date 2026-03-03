
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: "*/*" }));

app.post("/tool/send_recap_video", async (req, res) => {
  console.log("BODY:", JSON.stringify(req.body));
  console.log("BODY RAW:", req.body?.toString());

  let conversation_summary, phone_number;

  try {
    const raw = req.body?.toString();
    const parsed = JSON.parse(raw);
    console.log("PARSED:", JSON.stringify(parsed));
    conversation_summary =
      parsed?.args?.conversation_summary ||
      parsed?.conversation_summary;
    phone_number =
      parsed?.args?.phone_number ||
      parsed?.phone_number;
  } catch(e) {
    conversation_summary =
      req.body?.args?.conversation_summary ||
      req.body?.conversation_summary;
    phone_number =
      req.body?.args?.phone_number ||
      req.body?.phone_number;
  }

  console.log("Résumé :", conversation_summary);
  console.log("Téléphone :", phone_number);

  if (!conversation_summary || !phone_number) {
    return res.json({ result: "Erreur : paramètres manquants" });
  }

  res.json({ result: "Parfait ! Votre récap vidéo sera envoyé sur WhatsApp dans quelques minutes !" });

  generateAndSend(conversation_summary, phone_number);
});

async function generateAndSend(summary, phone) {
  try {
    console.log("Génération vidéo...");
    const videoUrl = await generateVideo(summary);
    console.log("Vidéo prête :", videoUrl);
    await sendWhatsApp(phone, videoUrl);
    console.log("WhatsApp envoyé !");
  } catch (err) {
    console.error("Erreur :", err.message);
  }
}

async function generateVideo(summary) {
  const texte = `Bonjour ! Je suis Lucas, conseiller Orange. Voici le récapitulatif de notre échange : ${summary}. N'hésitez pas à nous rappeler pour toute question. À bientôt !`;

  const response = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: {
      "X-Api-Key": process.env.HEYGEN_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [{
        character: {
          type: "avatar",
          avatar_id: process.env.HEYGEN_AVATAR_ID
        },
        voice: {
          type: "text",
          input_text: texte,
          voice_id: process.env.HEYGEN_VOICE_ID
        }
      }],
      dimension: { width: 1280, height: 720 }
    }),
  });

  const data = await response.json();
  console.log("HeyGen:", JSON.stringify(data));

  if (!data.data?.video_id) throw new Error("HeyGen erreur : " + JSON.stringify(data));

  const videoId = data.data.video_id;

  for (let i = 0; i < 40; i++) {
    await attendre(15000);
    const statusRes = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      { headers: { "X-Api-Key": process.env.HEYGEN_API_KEY } }
    );
    const statusData = await statusRes.json();
    const status = statusData.data?.status;
    console.log(`Statut (${i + 1}/40) :`, status);
    if (status === "completed") return statusData.data.video_url;
    if (status === "failed") throw new Error("Génération échouée");
  }
  throw new Error("Timeout");
}

async function sendWhatsApp(phone, videoUrl) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  const body = new URLSearchParams({
    From: `whatsapp:${fromNumber}`,
    To: `whatsapp:${phone}`,
    Body: "Voici votre récap vidéo de notre échange avec Lucas, conseiller Orange !",
    MediaUrl: videoUrl,
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
}

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));

