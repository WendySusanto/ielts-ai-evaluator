// Shown on the auth forms and in every page footer so nobody mistakes this
// for an official IELTS sign-in page.
export const DISCLAIMER =
  "Independent practice tool. Not affiliated with or endorsed by IELTS, IDP, British Council or Cambridge. Do not use your official IELTS account credentials here.";

export function DisclaimerNote() {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-center text-xs leading-relaxed text-muted-foreground">
      {DISCLAIMER}
    </p>
  );
}

export function SiteFooter() {
  return (
    <footer className="px-4 py-6 text-center text-xs leading-relaxed text-muted-foreground">
      {DISCLAIMER}
    </footer>
  );
}
