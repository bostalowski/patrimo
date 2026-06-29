import { describe, expect, it } from "vitest";
import { getAssetSourceUrl } from "@/lib/prices/source-url";
import type { Asset } from "@/lib/schema";

function manualAsset(param?: string): Asset {
  return {
    id: "PER-CIC-AVENIR",
    label: "CM-AM Avenir Dynamique",
    type: "FCPE",
    source: "manual",
    currency: "EUR",
    param,
  };
}

describe("getAssetSourceUrl — source manual", () => {
  it("renvoie l'URL quand param est une URL https", () => {
    const url =
      "https://www.zonebourse.com/cours/fonds/CM-AM-AVENIR-DYNAMIQUE-159203373/";
    expect(getAssetSourceUrl(manualAsset(url))).toBe(url);
  });

  it("renvoie l'URL quand param est une URL http", () => {
    const url = "http://exemple.fr/vl";
    expect(getAssetSourceUrl(manualAsset(url))).toBe(url);
  });

  it("renvoie null quand param est absent", () => {
    expect(getAssetSourceUrl(manualAsset(undefined))).toBeNull();
  });

  it("renvoie null quand param est un ISIN brut", () => {
    expect(getAssetSourceUrl(manualAsset("990000003359"))).toBeNull();
  });

  it("renvoie null pour un schéma non http(s)", () => {
    expect(getAssetSourceUrl(manualAsset("javascript:alert(1)"))).toBeNull();
    expect(getAssetSourceUrl(manualAsset("file:///etc/passwd"))).toBeNull();
  });
});
