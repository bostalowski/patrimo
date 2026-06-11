import type { Asset, PriceSource } from "@/lib/schema";

const SOURCE_LABELS: Record<PriceSource, string> = {
  coingecko: "CoinGecko",
  yahoo: "Yahoo Finance",
  investir: "Investir Les Echos",
  manual: "Saisie manuelle",
};

export function getSourceLabel(source: PriceSource): string {
  return SOURCE_LABELS[source];
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
    case "manual":
      return null;
    default:
      return null;
  }
}
