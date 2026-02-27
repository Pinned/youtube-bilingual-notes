export function segmentPrompt(params: { range: string; transcriptWithTimestamps: string }) {
  return `Segment range: ${params.range}\nTranscript (with timestamps):\n${params.transcriptWithTimestamps}\n\nOutput in the following format (keep headings exactly):\n1) Title (EN) / 标题（中文）\n2) Key Quotes (EN, 3–5 items, each with timestamp) / 原句摘录（英文，3–5 条，带时间戳）\n3) Key Points (EN→CN paired bullets, 5–10 pairs)\n4) Terms (EN — CN — one-line explanation in CN)\n5) Steps/Process (if any, EN→CN paired)\n6) Examples (if any, EN quote + CN explanation)\n7) Pitfalls / 常见误解（EN→CN paired)\n\nRules:\n- Do NOT invent content not present in the transcript.\n- Keep EN and CN aligned one-to-one.\n- Prefer concise bullets; preserve meaning over literal translation.`;
}

export function fullPrompt(params: { allSegmentNotes: string }) {
  return `Here are 12 segment notes (EN→CN). Merge them into a single document:\n${params.allSegmentNotes}\n\nOutput structure:\nA) Course Outline (EN→CN)\nB) Key Concepts Table (EN term — CN — brief CN definition)\nC) If you remember only 10 things (EN→CN)\nD) Q&A for review (8–12 questions, EN→CN)\nE) Action items / Practice (EN→CN)\n\nRules:\n- Remove duplication, keep consistent terminology.\n- If segments conflict, note it as Possible inconsistency (EN→CN) and cite the segment range.`;
}
