import type { Asset, PriceSource } from "@/lib/schema";

const SOURCE_LABELS: Record<PriceSource, string> = {
  coingecko: "CoinGecko",
  yahoo: "Yahoo Finance",
  investir: "Investir Les Echos",
  zonebourse: "Zonebourse",
  manual: "Saisie manuelle",
};

export function getSourceLabel(source: PriceSource): string {
  return SOURCE_LABELS[source];
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function getAssetSourceUrl(asset: Asset): string | null {
  if (!asset.param) return null;
  switch (asset.source) {
    case "coingecko":
      return `https://www.coingecko.com/en/coins/${encodeURIComponent(asset.param)}`;
    case "yahoo":
      return `https://finance.yahoo.com/quote/${encodeURIComponent(asset.param)}`;
    case "investir":
      return `https://investir.lesechos.fr/cours/opcvm/-${asset.param.toLowerCase()}`;
    case "zonebourse":
      return asset.param;
    case "manual":
      return isHttpUrl(asset.param) ? asset.param : null;
    default:
      return null;
  }
}
