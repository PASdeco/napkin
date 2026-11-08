"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchIdea, fetchCurrentWeek, fetchBoard } from "@/lib/napkin";
import { isChainConfigured, shortAddress, EXPLORER_URL } from "@/lib/chain";
import { Nav, Footer } from "@/components/site";
import ResultPanel from "@/components/result-panel";

export default function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ideaId = Number(id);
  const configured = isChainConfigured();

  const ideaQ = useQuery({
    queryKey: ["idea", ideaId],
    queryFn: () => fetchIdea(ideaId),
    enabled: configured && Number.isFinite(ideaId),
  });
  const weekQ = useQuery({ queryKey: ["week"], queryFn: fetchCurrentWeek, enabled: configured });
  const boardQ = useQuery({
    queryKey: ["board", ideaQ.data?.week],
    queryFn: () => fetchBoard(ideaQ.data!.week, 100),
    enabled: configured && ideaQ.data != null,
  });

  const idea = ideaQ.data;
  const rank = idea && boardQ.data
    ? [...boardQ.data].sort((a, b) => b.overall - a.overall || a.id - b.id).findIndex((i) => i.id === idea.id) + 1
    : 0;
  const shareText = idea
    ? encodeURIComponent(`My idea scored ${idea.overall}/100 on Napkin — "${idea.text.slice(0, 80)}${idea.text.length > 80 ? "…" : ""}"`)
    : "";
  const shareUrl = encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/idea/${ideaId}`);

  return (
    <>
      <div className="dots">
        <div className="wrap">
          <Nav />
          <header className="hero" style={{ gridTemplateColumns: "1fr", paddingTop: 12, paddingBottom: 48 }}>
            <div>
              <h1 style={{ fontSize: "clamp(38px,5vw,64px)" }}>Idea <em>#{ideaId}</em></h1>
              {idea && (
                <p className="lede">
                  Pitched by {shortAddress(idea.author)} in week {idea.week} · category {idea.category}
                  {rank > 0 ? ` · rank #${rank} this week` : ""}
                </p>
              )}
            </div>
            <div className="stage">
              {ideaQ.isLoading && <div className="notice">Loading the napkin…</div>}
              {ideaQ.isError && <div className="notice"><b>Could not load this idea.</b> It may not exist — check the id or the board.</div>}
              {idea && <ResultPanel idea={idea} rank={rank} entered={rank > 0} />}
              {idea && (
                <div className="try">
                  <span>Share</span>
                  <button
                    className="chip"
                    onClick={() => {
                      void navigator.clipboard?.writeText(`${window.location.origin}/idea/${ideaId}`);
                    }}
                  >
                    Copy link
                  </button>
                  <a className="chip" href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noreferrer">
                    Share on X
                  </a>
                </div>
              )}
            </div>
          </header>
          <Footer />
        </div>
      </div>
    </>
  );
}
