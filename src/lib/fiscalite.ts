import type { AssetType, Envelope, Workbook } from "@/lib/schema";

export type RealizedEventKind = "PV" | "DIVIDENDE" | "INTERET" | "RETRAIT";

export type RealizedEvent = {
  date: Date;
  year: number;
  accountId: string;
  accountLabel: string;
  envelope: Envelope;
  assetId: string;
  assetLabel: string;
  assetType?: AssetType;
  kind: RealizedEventKind;
  quantity: number;
  proceeds: number;
  costBasis: number;
  gain: number;
};

type Position = {
  quantity: number;
  costBasis: number;
};

type EnvelopeState = {
  deposits: number;
  withdrawals: number;
  bookedGains: number;
};

const TAXABLE_ON_WITHDRAWAL: ReadonlySet<Envelope> = new Set(["PEA", "PEE", "AV", "PER"]);

const accountAssetKey = (accountId: string, assetId: string): string =>
  `${accountId}::${assetId}`;

function ensure<K, V>(map: Map<K, V>, key: K, factory: () => V): V {
  const existing = map.get(key);
  if (existing !== undefined) return existing;
  const created = factory();
  map.set(key, created);
  return created;
}

export function buildRealizedEvents(workbook: Workbook): RealizedEvent[] {
  const events: RealizedEvent[] = [];
  const positions = new Map<string, Position>();
  const envelopeState = new Map<Envelope, EnvelopeState>();

  const accountMap = new Map(workbook.accounts.map((a) => [a.id, a]));
  const assetMap = new Map(workbook.assets.map((a) => [a.id, a]));

  const envelopeOf = (accountId: string): Envelope =>
    accountMap.get(accountId)?.envelope ?? "CTO";

  const labelFor = (accountId: string): string =>
    accountMap.get(accountId)?.label ?? accountId;

  const assetLabelFor = (assetId: string): string =>
    assetMap.get(assetId)?.label ?? assetId;

  const assetTypeFor = (assetId: string): AssetType | undefined =>
    assetMap.get(assetId)?.type;

  for (const tx of workbook.transactions) {
    const envelope = envelopeOf(tx.compte);
    const envState = ensure(envelopeState, envelope, () => ({
      deposits: 0,
      withdrawals: 0,
      bookedGains: 0,
    }));

    const positionKey = accountAssetKey(tx.compte, tx.actif);
    const position = ensure(positions, positionKey, () => ({
      quantity: 0,
      costBasis: 0,
    }));

    const fees = tx.frais ?? 0;
    const price = tx.prixUnitaire ?? 0;
    const qty = tx.quantite;
    const year = tx.date.getUTCFullYear();

    switch (tx.type) {
      case "ACHAT": {
        position.quantity += qty;
        position.costBasis += qty * price + fees;
        break;
      }

      case "VENTE": {
        const proceeds = qty * price - fees;
        const pru = position.quantity > 0 ? position.costBasis / position.quantity : 0;
        const basisSold = pru * qty;
        const gain = proceeds - basisSold;
        position.quantity -= qty;
        position.costBasis -= basisSold;
        envState.bookedGains += gain;

        events.push({
          date: tx.date,
          year,
          accountId: tx.compte,
          accountLabel: labelFor(tx.compte),
          envelope,
          assetId: tx.actif,
          assetLabel: assetLabelFor(tx.actif),
          assetType: assetTypeFor(tx.actif),
          kind: "PV",
          quantity: qty,
          proceeds,
          costBasis: basisSold,
          gain,
        });
        break;
      }

      case "DIVIDENDE": {
        if (price > 0) {
          const income = qty * price - fees;
          envState.bookedGains += income;
          events.push({
            date: tx.date,
            year,
            accountId: tx.compte,
            accountLabel: labelFor(tx.compte),
            envelope,
            assetId: tx.actif,
            assetLabel: assetLabelFor(tx.actif),
            assetType: assetTypeFor(tx.actif),
            kind: "DIVIDENDE",
            quantity: qty,
            proceeds: income,
            costBasis: 0,
            gain: income,
          });
        } else {
          position.quantity += qty;
        }
        break;
      }

      case "INTERET": {
        const income = qty * price - fees;
        envState.bookedGains += income;
        events.push({
          date: tx.date,
          year,
          accountId: tx.compte,
          accountLabel: labelFor(tx.compte),
          envelope,
          assetId: tx.actif,
          assetLabel: assetLabelFor(tx.actif),
          assetType: assetTypeFor(tx.actif),
          kind: "INTERET",
          quantity: qty,
          proceeds: income,
          costBasis: 0,
          gain: income,
        });
        break;
      }

      case "DEPOT": {
        envState.deposits += qty * price;
        break;
      }

      case "RETRAIT": {
        const amount = qty * price;
        envState.withdrawals += amount;

        const pru = position.quantity > 0 ? position.costBasis / position.quantity : 0;
        position.quantity -= qty;
        position.costBasis -= pru * qty;

        if (TAXABLE_ON_WITHDRAWAL.has(envelope)) {
          const total = envState.deposits + envState.bookedGains;
          const gainShare =
            total > 0 ? Math.max(0, envState.bookedGains) / total : 0;
          const gainPortion = amount * gainShare;
          events.push({
            date: tx.date,
            year,
            accountId: tx.compte,
            accountLabel: labelFor(tx.compte),
            envelope,
            assetId: tx.actif,
            assetLabel: assetLabelFor(tx.actif),
            assetType: assetTypeFor(tx.actif),
            kind: "RETRAIT",
            quantity: qty,
            proceeds: amount,
            costBasis: amount - gainPortion,
            gain: gainPortion,
          });
        }
        break;
      }

      case "TRANSFERT": {
        const destinationId = tx.compteDestination;
        if (!destinationId) break;
        const destKey = accountAssetKey(destinationId, tx.actif);
        const destPos = ensure(positions, destKey, () => ({
          quantity: 0,
          costBasis: 0,
        }));
        const networkFee = tx.fraisDevise === tx.actif ? fees : 0;
        const pru = position.quantity > 0 ? position.costBasis / position.quantity : 0;
        const basisMoved = pru * qty;
        position.quantity -= qty;
        position.costBasis -= basisMoved;
        destPos.quantity += qty - networkFee;
        destPos.costBasis += basisMoved;
        break;
      }
    }
  }

  return events;
}

export type EnvelopeYearlySummary = {
  envelope: Envelope;
  realizedPnL: number;
  dividends: number;
  interest: number;
  withdrawalAmount: number;
  withdrawalGain: number;
  events: RealizedEvent[];
};

export type YearlyReport = {
  year: number;
  envelopes: EnvelopeYearlySummary[];
};

const ENVELOPE_ORDER: Envelope[] = ["CTO", "PEA", "PEE", "AV", "PER"];

export function buildYearlyReports(events: RealizedEvent[]): YearlyReport[] {
  const byYear = new Map<number, Map<Envelope, EnvelopeYearlySummary>>();

  for (const event of events) {
    const yearMap = ensure(byYear, event.year, () => new Map());
    const summary = ensure(yearMap, event.envelope, () => ({
      envelope: event.envelope,
      realizedPnL: 0,
      dividends: 0,
      interest: 0,
      withdrawalAmount: 0,
      withdrawalGain: 0,
      events: [],
    }));
    summary.events.push(event);
    if (event.kind === "PV") summary.realizedPnL += event.gain;
    else if (event.kind === "DIVIDENDE") summary.dividends += event.gain;
    else if (event.kind === "INTERET") summary.interest += event.gain;
    else if (event.kind === "RETRAIT") {
      summary.withdrawalAmount += event.proceeds;
      summary.withdrawalGain += event.gain;
    }
  }

  const reports: YearlyReport[] = [];
  for (const [year, envMap] of byYear.entries()) {
    const envelopes = Array.from(envMap.values()).sort((a, b) => {
      const ai = ENVELOPE_ORDER.indexOf(a.envelope);
      const bi = ENVELOPE_ORDER.indexOf(b.envelope);
      return (ai === -1 ? ENVELOPE_ORDER.length : ai) - (bi === -1 ? ENVELOPE_ORDER.length : bi);
    });
    reports.push({ year, envelopes });
  }

  reports.sort((a, b) => a.year - b.year);
  return reports;
}
