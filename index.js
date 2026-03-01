import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

app.post("/tool/send_recap_video", async (req, res) => {
const args = req.body.args || req.body;
const { conversation_summary, phone_number } = args;
  console.log(":telephone_receiver: Résumé reçu :", conversation_summary);
  console.log(":iphone: Envoi à :", phone_number);

  try {
    console.log(":clapper: Génération de la vidéo...");
    const videoUrl = await generateVideo(conversation_summary);
    console.log(":white_check_mark: Vidéo prête :", videoUrl);

    console.log(":outbox_tray: Envoi WhatsApp...");
    await sendWhatsApp(phone_number, videoUrl);
    console.log(":white_check_mark: WhatsApp envoyé !");

    res.json({ result: "Vidéo récap envoyée avec succès par WhatsApp !" });

  } catch (err) {
    console.error(":x: Erreur :", err.message);
    res.json({ result: "Erreur : " + err.message });
  }
});

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
  voice_id: "2d5b0e6cf36f460aa7fc47e3eee4ba54"
}
      }],
      dimension: { width: 1280, height: 720 }
    }),
  });

  const data = await response.json();
  console.log("HeyGen response:", JSON.stringify(data));

  if (!data.data?.video_id) {
    throw new Error("HeyGen erreur : " + JSON.stringify(data));
  }

  const videoId = data.data.video_id;

  for (let i = 0; i < 40; i++) {
    await attendre(15000);

    const statusRes = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      { headers: { "X-Api-Key": process.env.HEYGEN_API_KEY } }
    );
    const statusData = await statusRes.json();
    const status = statusData.data?.status;
    console.log(`:hourglass_flowing_sand: Statut vidéo (${i + 1}/40) :`, status);

    if (status === "completed") return statusData.data.video_url;
    if (status === "failed") throw new Error("Génération vidéo échouée");
  }

  throw new Error("Timeout : vidéo trop longue à générer");
}

async function sendWhatsApp(phone, videoUrl) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  const body = new URLSearchParams({
    From: `whatsapp:${fromNumber}`,
    To: `whatsapp:${phone}`,
    Body: ":clapper: Bonjour ! Voici votre récap vidéo de notre échange avec Lucas, conseiller Orange Maison Protégée. À bientôt !",
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
  console.log("Twilio response:", JSON.stringify(result));
  if (result.error_code) throw new Error("Twilio : " + result.message);
}

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`:rocket: Serveur démarré sur le port ${PORT}`));

