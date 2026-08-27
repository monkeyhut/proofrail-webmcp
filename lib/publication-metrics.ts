export type PublicationMetric = {
  value: string;
  visualPercent: number | null;
};

const COUNT_WITH_UNIT =
  /\b\d[\d.,]*\+?\s?(?:×|x|ms|milliseconds?|seconds?|secs?|minutes?|mins?|hours?|days?|weeks?|months?|years?|users?|customers?|teams?|sign-ups?|buildings?|cities?|markets?|countries?|projects?|responses?|participants?)\b/i;

/**
 * Extract only a quantity that is already present in the public copy.
 * The exact unit stays attached and charts remain disabled unless the copy
 * contains a bounded percentage. A missing quantity returns null rather than
 * inventing a decorative KPI.
 */
export function extractPublicationMetric(
  headline: string,
  body: string,
): PublicationMetric | null {
  const copy = `${headline} ${body}`;
  const percentage = copy.match(/\b(\d{1,3}(?:[.,]\d+)?)\s*%/);
  if (percentage) {
    const value = `${percentage[1]}%`;
    const parsed = Number.parseFloat(percentage[1].replace(",", "."));
    return {
      value,
      visualPercent:
        Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null,
    };
  }

  const countWithUnit = copy.match(COUNT_WITH_UNIT)?.[0];
  if (countWithUnit) {
    return {
      value: countWithUnit.replace(/\s+/g, " "),
      visualPercent: null,
    };
  }

  return null;
}
