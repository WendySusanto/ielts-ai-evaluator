// src/pages/Landing.tsx — public front door, so the site never opens straight onto a login form.
import { LogoMark } from "@/components/AppSidebar";
import { DisclaimerNote, SiteFooter } from "@/components/Disclaimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookMarked, Edit3, LayoutDashboard, Mic } from "lucide-react";
import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: Mic,
    title: "Speaking practice",
    text: "Hold a spoken conversation with an AI examiner that asks follow-up questions based on what you actually said.",
  },
  {
    icon: Edit3,
    title: "Writing feedback",
    text: "Submit a Task 1 or Task 2 essay and see each mistake marked in your text with its correction.",
  },
  {
    icon: BookMarked,
    title: "Vocabulary notebook",
    text: "Save suggested word upgrades with the sentence you used them in, then review them as flashcards.",
  },
  {
    icon: LayoutDashboard,
    title: "Progress tracking",
    text: "Follow your estimated band over time and see which criterion is holding each skill back.",
  },
];

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-3 px-4 py-4 md:px-8">
        <LogoMark />
        <span className="font-semibold">When Band 7?</span>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          {/* Phones get the hero's Get started instead; both don't fit beside the name. */}
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/register">Create account</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-12 px-4 py-12 md:px-8">
        <section className="mx-auto max-w-2xl space-y-5 text-center">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Practise for the IELTS Writing and Speaking tests with AI feedback
          </h1>
          <p className="text-muted-foreground">
            Write an essay or answer spoken questions, then get an estimated
            band for each criterion and notes on what to improve. Scores are
            AI estimates for self-study, not official results.
          </p>
          <DisclaimerNote />
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/register">Get started</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/login">I have an account</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="space-y-2">
                <Icon className="size-5 text-primary" />
                <h2 className="font-semibold text-card-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
