type QualityInput = {
  category: "room" | "studio" | "flat";
  photoCount: number;
  wordCount: number;
  rent: number | null;
  dues: number | null;
  utilities_estimate: number | null;
  other_costs: number | null;
  deposit: number | null;
  utilities_included: boolean;
  household_size: number | null;
  residents_female: number | null;
  residents_male: number | null;
  wanted_gender: string | null;
  smoking: string | null;
  household_types: string[];
  flat_size_m2: number | null;
  phoneVerified: boolean;
};

const PHONE_POINTS = 10;

/**
 * Section 5.7 scoring. While phone verification is off the phone points cannot
 * be earned, so the rest rescales and a listing can still reach 100.
 */
export function computeQualityScore(
  input: QualityInput,
  phoneVerificationEnabled: boolean,
): number {
  let score = 0;

  if (input.photoCount >= 3) score += 25;
  if (input.photoCount >= 6) score += 10;
  if (input.wordCount >= 50) score += 20;
  if (input.wordCount >= 150) score += 10;

  const costs = [
    input.rent,
    input.dues,
    input.other_costs,
    input.deposit,
    input.utilities_included ? 0 : input.utilities_estimate,
  ];
  if (costs.every((cost) => cost !== null)) score += 10;

  const detailsComplete =
    input.category === "room"
      ? input.household_size !== null &&
        input.residents_female !== null &&
        input.residents_male !== null &&
        input.wanted_gender !== null &&
        input.smoking !== null &&
        input.household_types.length > 0
      : input.flat_size_m2 !== null;
  if (detailsComplete) score += 15;

  if (!phoneVerificationEnabled) {
    return Math.round((score * 100) / (100 - PHONE_POINTS));
  }

  return score + (input.phoneVerified ? PHONE_POINTS : 0);
}
