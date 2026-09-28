/**
 * Presentation-only artwork resolution. Never persist these fallbacks back
 * to Course.thumbnail: the original value still belongs to the editing tools.
 */
export const DEFAULT_COURSE_COVER = "/course-covers/course-fallback.webp";

export const COURSE_COVER_CODES = [
  "BTC-BUS-201",
  "BTC-CAR-201",
  "BTC-COM-201",
  "BTC-CT-201",
  "BTC-LIVE-101",
  "CST-ASE-301",
  "CST-BIO-201",
  "CST-BIO-202",
  "CST-BIO-203",
  "CST-CAPA-201",
  "CST-CT-201",
  "CST-CT-202",
  "CST-DSP-201",
  "CST-DSP-202",
  "CST-DSP-203",
  "CST-GDP-101",
  "CST-GMP-101",
  "CST-GMP-201",
  "CST-GMP-202",
  "CST-GMP-203",
  "CST-QA-201",
  "CST-QC-201",
  "CST-QC-202",
  "CST-QC-203",
  "CST-RA-201",
  "CST-USP-201",
  "CST-USP-202",
  "CST-USP-203",
  "PW-BIO-01",
  "PW-BIO-02",
  "PW-BIO-03",
  "PW-BIO-04",
  "PW-ENT-01",
  "PW-MA-01",
  "PW-QA-01",
  "PW-QA-02",
  "PW-RA-01",
  "PW-RD-01",
  "PW-RD-02",
  "SEN-BOOT-101",
  "TA-AI-101",
  "TA-BUS-201",
  "TA-BUS-202",
  "TA-CAR-101",
  "TA-CAR-201",
  "TA-CAR-202",
  "TA-CAR-203",
  "TA-CAR-204",
  "TA-CP-APX",
  "TA-CP-AZ",
  "TA-CP-CRL",
  "TA-CP-EUR",
  "TA-CP-RCH",
  "TA-CP-SAN",
  "TA-CP-STE",
  "TA-CYB-101",
  "TA-MAB-201",
  "TA-SEC-201",
  "TA-SEC-202",
  "TA-SEC-203",
  "TA-SEC-204",
  "TA-SEC-205",
] as const;

const bundledCovers = new Map<string, string>(
  COURSE_COVER_CODES.map((code) => [code, `/course-covers/${code.toLowerCase()}.webp`]),
);

/** Preserve configured artwork, then try a known bundled cover, then generic. */
export function getCourseCoverSources(course: {
  thumbnail?: string | null;
  code?: string | null;
}): string[] {
  const configured = course.thumbnail?.trim();
  const bundled = bundledCovers.get(course.code?.trim().toUpperCase() ?? "");
  return [...new Set(
    [configured, bundled, DEFAULT_COURSE_COVER].filter(
      (source): source is string => Boolean(source),
    ),
  )];
}
