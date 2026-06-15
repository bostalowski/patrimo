export type BenchmarkConfig = {
  id: string;
  label: string;
  symbol: string;
};

export const BENCHMARKS: readonly BenchmarkConfig[] = [
  {
    id: "WPEA",
    label: "WPEA (MSCI World)",
    symbol: "WPEA.PA",
  },
  {
    id: "SP500",
    label: "S&P 500",
    symbol: "^GSPC",
  },
  {
    id: "CAC40",
    label: "CAC 40",
    symbol: "^FCHI",
  },
  {
    id: "BTC",
    label: "Bitcoin",
    symbol: "BTC-EUR",
  },
];

export function findBenchmark(id: string): BenchmarkConfig | undefined {
  return BENCHMARKS.find((b) => b.id === id);
}
