import type { Workbook } from "@patrimo/core/schema";

export {
  applyJustEtfGeographicSync,
  parseJustEtfCountryWeights,
  type JustEtfCountryWeight,
} from "@patrimo/core/justetf-geography";

export async function fetchJustEtfProfileHtml(isin: string): Promise<string> {
  const url = `https://www.justetf.com/fr/etf-profile.html?isin=${encodeURIComponent(isin)}`;
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`JustETF ${isin}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

export type { Workbook };
