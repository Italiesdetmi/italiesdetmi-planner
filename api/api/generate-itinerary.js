let cleaned = text;

// remove Markdown fences like ```json ... ```
cleaned = cleaned.replace(/```json/i, "");
cleaned = cleaned.replace(/```/g, "");
cleaned = cleaned.trim();

// attempt to extract JSON object
let parsed;
try {
  parsed = JSON.parse(cleaned);
} catch (err) {
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    parsed = JSON.parse(match[0]);
  } else {
    return res.status(500).json({
      error: "Unable to parse model output as JSON.",
      raw: cleaned,
    });
  }
}
