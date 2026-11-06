// Kept free of imports so `npm run check:speaking-feedback` can run it under plain Node, like lexical.ts.

/** For each turn, the item whose `answer` matches its candidate answer number (1..n over non-examiner
 * turns, as SpeakingService numbers them for Gemini — keep in step), else undefined. */
export function matchAnswersToTurns<A extends { answer: number }>(
  turns: { role: string }[],
  answers: A[] | null | undefined,
): (A | undefined)[] {
  let answerCount = 0;
  return turns.map((turn) => {
    if (turn.role === "examiner") return undefined;
    answerCount += 1;
    const answerNumber = answerCount;
    return answers?.find((a) => a.answer === answerNumber);
  });
}

/** Groups mistakes by category, biggest group first, so a pattern ("tense · 4") leads the card.
 * Groups of equal size keep the order Gemini listed them in, which is most impactful first. */
export function groupByCategory<E extends { category: string }>(errors: E[]): [string, E[]][] {
  const groups = new Map<string, E[]>();
  for (const error of errors) {
    const category = error.category.trim().toLowerCase() || "other";
    groups.set(category, [...(groups.get(category) ?? []), error]);
  }
  return [...groups].sort((a, b) => b[1].length - a[1].length);
}

// Mirror ExaminerService.MaxExaminerTurns and the "ask 4-6 of your own" line in ExaminerPrompts.
const EXAMINER_TURN_CAP = 8;
const UNSCRIPTED_QUESTIONS = 5;

/** The examiner's progress through a live speaking part, for the counter above the conversation. The
 * total is what the examiner plans to ask — Part 1/3's script (`cuepoints`, one question per line), or
 * Part 2's cue card plus one rounding-off question — not the server's hard turn cap, which only stops a
 * runaway examiner. A finished part counts as every question asked: its last examiner line is a
 * closing remark, and an early finish (the recording limit) still ends the part. */
export function questionProgress(
  part: string,
  cuepoints: string | null | undefined,
  turns: { role: string }[],
  partComplete: boolean,
): { asked: number; total: number } {
  const script = (cuepoints ?? "").split("\n").filter((line) => line.trim()).length;
  const total = Math.min(part === "Part2" ? 2 : script || UNSCRIPTED_QUESTIONS, EXAMINER_TURN_CAP);
  // ponytail: a follow-up question counts like a scripted one, so the counter can reach the total a
  // question early. Exact counting needs the examiner endpoint to say which scripted question it is on.
  const asked = partComplete
    ? total
    : Math.min(turns.filter((t) => t.role === "examiner").length, total);
  return { asked, total };
}
