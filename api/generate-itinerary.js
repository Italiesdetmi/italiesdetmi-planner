// api/generate-itinerary.js - clean version
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildPrompt({ dest, days, ages, pace, prefs }) {
  return `
You are an expert family travel planner for Italy.
Return ONLY valid JSON. No markdown, no code blocks.

Keys:
- title
- description
- days: array of day objects
- summary

Each day object must be:
{
  "dayNumber": number,
  "headline": "",
  "activities": [
    { "time": "", "activity": "", "details": "" }
  ],
  "travelInfo": "",
  "childNotes": "",
  "accommodationSuggestion": ""
}

Destination: ${dest}
Days: ${days}
Ages: ${ages}
Pace: ${pace}
Preferences: ${prefs}
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
        { role: "system", content: "You generate JSON only." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1800,
    });

    const raw = completion.choices[0].message.content;

    // CLEAN OUTPUT
    let cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // PARSE JSON SAFELY
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return res.status(500).json({
          error: "Model did not return valid JSON",
          raw: cleaned
        });
      }
    }

    return res.status(200).json({ ok: true, itinerary: parsed });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
