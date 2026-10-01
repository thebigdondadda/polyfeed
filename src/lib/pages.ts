export const SITE_PAGES = [
  "home",
  "signin",
  "signup",
  "overview",
  "faq",
  "risk",
  "support",
  "traders",
  "copy",
  "autosell",
  "bets",
  "how",
  "terms",
  "privacy",
  "cookies",
  "disclaimer",
] as const;

export type SitePage = (typeof SITE_PAGES)[number];

export function pageFromHash(hash: string): SitePage {
  const id = hash.replace(/^#/, "");
  if ((SITE_PAGES as readonly string[]).includes(id)) {
    return id as SitePage;
  }
  return "home";
}

export const DOC_PAGES = [
  "overview",
  "faq",
  "risk",
  "support",
  "traders",
  "copy",
  "autosell",
  "bets",
  "how",
  "terms",
  "privacy",
  "cookies",
  "disclaimer",
] as const;

export type DocPageId = (typeof DOC_PAGES)[number];
export type LegalPageId = DocPageId;
