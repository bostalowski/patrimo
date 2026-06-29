import { describe, expect, it } from "vitest";
import { clampSyncIntervalMinutes, shouldRunSync } from "@/lib/prices/schedule";

describe("clampSyncIntervalMinutes", () => {
  it("ramène une valeur de 2 minutes (sous le minimum) à 5", () => {
    expect(clampSyncIntervalMinutes(2)).toBe(5);
  });

  it("laisse 5 minutes (pile au minimum) inchangé", () => {
    expect(clampSyncIntervalMinutes(5)).toBe(5);
  });

  it("laisse 30 minutes (dans la plage) inchangé", () => {
    expect(clampSyncIntervalMinutes(30)).toBe(30);
  });

  it("laisse 1440 minutes (pile au maximum) inchangé", () => {
    expect(clampSyncIntervalMinutes(1440)).toBe(1440);
  });

  it("ramène 5000 minutes (au-dessus du maximum) à 1440", () => {
    expect(clampSyncIntervalMinutes(5000)).toBe(1440);
  });

  it("ramène une valeur négative au minimum 5", () => {
    expect(clampSyncIntervalMinutes(-10)).toBe(5);
  });

  it("retombe sur le défaut 30 pour une valeur absente", () => {
    expect(clampSyncIntervalMinutes(undefined)).toBe(30);
  });

  it("retombe sur le défaut 30 pour une valeur non numérique", () => {
    expect(clampSyncIntervalMinutes(Number.NaN)).toBe(30);
    expect(clampSyncIntervalMinutes("oops")).toBe(30);
  });
});

describe("shouldRunSync", () => {
  const intervalMinutes = 30;
  const now = Date.parse("2026-06-29T10:00:00Z");

  it("force la synchro sur un clic manuel même si les cours datent d'une minute", () => {
    expect(
      shouldRunSync({
        ifStale: false,
        lastSync: "2026-06-29T09:59:00Z",
        now,
        intervalMinutes,
      }),
    ).toBe(true);
  });

  it("force la synchro sur un clic manuel même sans historique", () => {
    expect(
      shouldRunSync({ ifStale: false, lastSync: null, now, intervalMinutes }),
    ).toBe(true);
  });

  it("ne synchronise pas en auto quand les cours sont plus récents que l'intervalle", () => {
    expect(
      shouldRunSync({
        ifStale: true,
        lastSync: "2026-06-29T09:45:00Z",
        now,
        intervalMinutes,
      }),
    ).toBe(false);
  });

  it("synchronise en auto quand les cours sont plus vieux que l'intervalle", () => {
    expect(
      shouldRunSync({
        ifStale: true,
        lastSync: "2026-06-29T09:00:00Z",
        now,
        intervalMinutes,
      }),
    ).toBe(true);
  });

  it("ne synchronise pas en auto quand l'âge est pile égal à l'intervalle", () => {
    expect(
      shouldRunSync({
        ifStale: true,
        lastSync: "2026-06-29T09:30:00Z",
        now,
        intervalMinutes,
      }),
    ).toBe(false);
  });

  it("synchronise en auto quand aucune synchro n'a jamais eu lieu", () => {
    expect(
      shouldRunSync({ ifStale: true, lastSync: null, now, intervalMinutes }),
    ).toBe(true);
  });
});
