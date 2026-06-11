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
];

export function findBenchmark(id: string): BenchmarkConfig | undefined {
  return BENCHMARKS.find((b) => b.id === id);
}
