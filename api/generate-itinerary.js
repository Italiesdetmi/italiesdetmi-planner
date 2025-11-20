// api/generate-itinerary.js  (Vercel serverless function)
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildPrompt({ dest, days, ages, pace, prefs }) {
  return `
You are an expert family travel planner for Italy. Produce a friendly, clear, practical itinerary for families with children.
Respond strictly in JSON with keys: title, description, days (array), summary.
Each day in "days" must be:
{
  "dayNumber": number,
  "headline": "",
  "activities": [{"time": "", "activity": "", "details": ""}],
  "travelInfo": "",
  "childNotes": "",
  "accommodationSuggestion": ""
}
Avoid personal info. Use safe driving times. Destination: ${dest}. Days: ${days}. Ages: ${ages}. Pace: ${pace}. Preferences: ${prefs}.
Return only valid JSON.
`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { dest, days, ages, pace, prefs } = req.body || {};

    if (!dest || !days) {
      return res.status(400).json({ error: "Missing required parameters." });
    }

    const prompt = buildPrompt({ dest, days, ages, pace, prefs });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a concise travel planner for families visiting Italy." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });

    const text = completion.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      // Fallback: try to extract JSON structure
      const match = text.match(/\{[\s\S]*\}$/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return res.status(500).json({
          error: "Unable to parse model output as JSON.",
          raw: text,
        });
      }
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, itinerary: parsed });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
