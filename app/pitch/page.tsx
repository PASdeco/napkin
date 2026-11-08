"use client";

import { Nav, Footer } from "@/components/site";
import NapkinForm from "@/components/napkin-form";

export default function PitchPage() {
  return (
    <>
      <div className="dots">
        <div className="wrap">
          <Nav />
          <header className="hero" id="top" style={{ gridTemplateColumns: "1fr", paddingTop: 12 }}>
            <div>
              <h1 style={{ fontSize: "clamp(38px,5vw,64px)" }}>Pitch an <em>idea.</em></h1>
              <p className="lede">
                400 characters or fewer. Five judging lenses score it through validator consensus — usually
                inside a minute. Top three of the week split the pool.
              </p>
            </div>
            <div className="stage">
              <NapkinForm />
            </div>
          </header>
          <Footer />
        </div>
      </div>
    </>
  );
}
