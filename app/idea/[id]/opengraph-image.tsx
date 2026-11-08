import { ImageResponse } from "next/og";
import { fetchIdea, fetchBoard } from "@/lib/napkin";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let score = "?";
  let verdict = "Napkin";
  let text = "";
  try {
    const idea = await fetchIdea(Number(id));
    score = String(idea.overall);
    verdict = idea.verdict.replace(/_/g, " ");
    text = idea.text.slice(0, 120) + (idea.text.length > 120 ? "…" : "");
    await fetchBoard(idea.week, 100);
  } catch {
    // OG images must never 500 — fall back to a neutral card.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#F4F1EA",
          color: "#14213D",
          padding: 80,
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ fontSize: 96, fontWeight: 700, color: "#2A4BD7" }}>{score}</div>
          <div style={{ fontSize: 40, fontStyle: "italic" }}>{verdict}</div>
        </div>
        <div style={{ fontSize: 40, lineHeight: 1.3, marginTop: 24, maxWidth: 1000 }}>{text || "Scribble the idea. Get it judged."}</div>
        <div style={{ fontSize: 28, color: "#6A6F7C", marginTop: 32 }}>Napkin · judged on GenLayer</div>
      </div>
    ),
    size,
  );
}
