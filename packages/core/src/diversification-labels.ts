import {
	geographicCountryLabel,
	isGeographicRegionKey,
	regionLabel,
} from "./geographic-exposure";
import { DIVERSIFICATION_CRYPTO_KEY } from "./diversification-targets";

export function diversificationKeyLabel(key: string): string {
	if (key === DIVERSIFICATION_CRYPTO_KEY) return "Crypto";
	if (isGeographicRegionKey(key)) return regionLabel(key);
	return geographicCountryLabel(key);
}
