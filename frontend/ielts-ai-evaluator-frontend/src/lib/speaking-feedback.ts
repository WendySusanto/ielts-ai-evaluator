// Kept free of imports so `npm run check:speaking-feedback` can run it under plain Node, like lexical.ts.

/** For each turn, the item whose `answer` matches its candidate answer number — feedback, a
 * recording — or undefined. Candidate answers are numbered 1..n in conversation order, every
 * non-examiner turn counting — the numbering SpeakingService puts in the transcript it sends to
 * Gemini, so the two must stay in step. Examiner turns, and answers with no item, get undefined. */
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
