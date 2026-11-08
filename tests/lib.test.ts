import { describe, expect, it } from "vitest";
import { normalize, prizeFor, POOL_SPLIT } from "../lib/napkin";
import { shortAddress, txErrorMessage } from "../lib/chain";

describe("normalize (contract read responses)", () => {
  it("parses JSON strings into objects", () => {
    const raw = '{"total_ideas":0,"current_week":0}';
    expect(normalize(raw)).toEqual({ total_ideas: 0, current_week: 0 });
  });
  it("passes objects through untouched", () => {
    expect(normalize({ a: 1 })).toEqual({ a: 1 });
  });
  it("unwraps {data: {...}} wrappers", () => {
    expect(normalize({ data: { a: 1 } })).toEqual({ a: 1 });
  });
  it("throws a readable error on empty responses", () => {
    expect(() => normalize("")).toThrow(/Empty response/);
    expect(() => normalize('""')).toThrow(/Empty response/);
  });
  it("throws a readable error on unparseable strings", () => {
    expect(() => normalize("not json at all")).toThrow(/Unparseable contract response/);
  });
});

describe("prize math (contract split 500/292/125 permille)", () => {
  it("matches the reference UI for a 2,400 pool", () => {
    expect(prizeFor(1, 2400)).toBe(1200);
    expect(prizeFor(2, 2400)).toBe(700);
    expect(prizeFor(3, 2400)).toBe(300);
  });
  it("pays nothing outside the top three", () => {
    expect(prizeFor(0, 2400)).toBe(0);
    expect(prizeFor(4, 2400)).toBe(0);
  });
  it("never sums to more than the pool", () => {
    const total = POOL_SPLIT.reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(1000);
  });
});

describe("formatting helpers", () => {
  it("shortens addresses as 6…4", () => {
    expect(shortAddress("0x0943F70E50c69bA811eB5C13e4A0a43c24bC2F5c")).toBe("0x0943…2F5c");
  });
  it("maps wallet rejections to a friendly message", () => {
    expect(txErrorMessage(new Error("user rejected the request"))).toMatch(/rejected/i);
  });
  it("extracts [EXPECTED] revert reasons", () => {
    expect(txErrorMessage(new Error("stuff [EXPECTED] Napkin is too short"))).toBe("Napkin is too short");
  });
});
