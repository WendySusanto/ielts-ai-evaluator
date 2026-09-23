namespace IELTS.AI.Evaluator.Functions.DTOs;

/// <summary>One of the three Gemini-scored IELTS speaking criteria for a single session.
/// Pronunciation is Azure PA's job (Phase 4) and is not part of this shape.
/// Rewrites is nullable because feedback is stored as jsonb and read back through this record:
/// sessions marked before rewrites existed have no such key, and must still open.</summary>
public record SpeakingCriterion(
    string Name,
    decimal Band,
    string Justification,
    List<string> Examples,
    List<string> Improvements,
    List<SpeakingRewrite>? Rewrites = null);

/// <summary>One of the candidate's own sentences, and how a stronger speaker would say it.</summary>
public record SpeakingRewrite(string Original, string Improved, string Explanation);

/// <summary>A C1/C2 word or phrase shown in place, inside a sentence the candidate actually said.
/// Level is "C1" or "C2" — Gemini's best estimate, not an English Vocabulary Profile lookup.</summary>
public record SpeakingVocabularyUpgrade(string Phrase, string Level, string Replaces, string Original, string Improved);

/// <summary>One turn of the conversation. Role: "examiner" | "candidate".
/// Lexical is Azure's raw recognition of a spoken candidate turn, with [pause N.Ns] markers —
/// null for examiner turns, for typed answers, and for every session recorded before this
/// existed. Text is display text: punctuated and tidied, so it hides the hesitations and
/// flatters the grammar. Both are sent to the scorer precisely so it can compare them.
/// DurationSeconds runs from the first recognized word to the end of the last, pauses included;
/// the service turns it into a speech rate rather than trusting one from the client.</summary>
public record SpeakingTurn(string Role, string Text, string? Lexical = null, decimal? DurationSeconds = null);

/// <summary>One word from Azure Pronunciation Assessment's per-word breakdown.</summary>
public record PronunciationWord(string Word, decimal AccuracyScore, string ErrorType);

/// <summary>Azure Pronunciation Assessment result, aggregated client-side across candidate turns
/// and submitted with the final evaluation. Band is always server-recomputed from
/// PronunciationScore — never trust a client-supplied value. WordsPerMinute follows the same
/// rule: derived server-side from the turns, whatever the client put here.</summary>
public record PronunciationResult(
    decimal Band,
    decimal PronunciationScore,
    decimal AccuracyScore,
    decimal FluencyScore,
    decimal ProsodyScore,
    decimal CompletenessScore,
    List<PronunciationWord> Words,
    decimal? WordsPerMinute = null);

/// <summary>Deep structured feedback for one speaking session. camelCase on the wire —
/// this is also the contract for the Phase 3 feedback screens. OverallBand here is the
/// service-computed average of the three criteria below, rounded to the nearest 0.5 —
/// not necessarily whatever Gemini put in its own overallBand field.</summary>
public record SpeakingFeedback(
    decimal OverallBand,
    string Summary,
    List<SpeakingCriterion> Criteria, // exactly 3 from Gemini: FluencyCoherence, LexicalResource, GrammaticalRangeAccuracy
    List<SpeakingVocabularyUpgrade>? Vocabulary = null); // null on sessions marked before it existed

/// <summary>Gemini responseSchema + system prompt for SpeakingFeedback. Designed together
/// (spec §8), same discipline as Task 5's WritingFeedbackPrompts.</summary>
public static class SpeakingFeedbackPrompts
{
    public const string GeminiSchema = @"{
        ""type"": ""OBJECT"",
        ""properties"": {
            ""overallBand"": {
                ""type"": ""NUMBER"",
                ""description"": ""Your best-effort overall band for the session, 0-9 in 0.5 increments. The caller recomputes the authoritative overall band as the average of the three criteria bands below, so this value is advisory.""
            },
            ""summary"": {
                ""type"": ""STRING"",
                ""description"": ""A 2-4 sentence plain-English summary of the candidate's overall spoken performance, naming the single biggest lever for improving the band score.""
            },
            ""criteria"": {
                ""type"": ""ARRAY"",
                ""minItems"": 3,
                ""maxItems"": 3,
                ""description"": ""Exactly three entries, one per Gemini-assessed IELTS speaking criterion, in this order: Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy. Pronunciation is assessed separately and is not included here."",
                ""items"": {
                    ""type"": ""OBJECT"",
                    ""properties"": {
                        ""name"": {
                            ""type"": ""STRING"",
                            ""description"": ""One of exactly: 'FluencyCoherence', 'LexicalResource', 'GrammaticalRangeAccuracy'.""
                        },
                        ""band"": {
                            ""type"": ""NUMBER"",
                            ""description"": ""This criterion's band, 0-9 in 0.5 steps, assessed independently against the official IELTS speaking band descriptors for this criterion.""
                        },
                        ""justification"": {
                            ""type"": ""STRING"",
                            ""description"": ""2-4 sentences explaining the band, citing specific evidence quoted verbatim from the candidate's turns.""
                        },
                        ""examples"": {
                            ""type"": ""ARRAY"",
                            ""items"": { ""type"": ""STRING"" },
                            ""description"": ""1-3 short direct quotes copied verbatim from the candidate's turns that illustrate this criterion's strengths or weaknesses.""
                        },
                        ""improvements"": {
                            ""type"": ""ARRAY"",
                            ""items"": { ""type"": ""STRING"" },
                            ""description"": ""1-3 specific, actionable changes the candidate can make to raise this criterion's band, each concrete enough to apply in the next practice session.""
                        },
                        ""rewrites"": {
                            ""type"": ""ARRAY"",
                            ""maxItems"": 3,
                            ""description"": ""0-3 of the candidate's weakest sentences for this criterion, each rewritten the way a band 7-8 speaker would say it aloud. Empty when nothing needs fixing."",
                            ""items"": {
                                ""type"": ""OBJECT"",
                                ""properties"": {
                                    ""original"": {
                                        ""type"": ""STRING"",
                                        ""description"": ""The candidate's sentence, copied verbatim from the display transcript.""
                                    },
                                    ""improved"": {
                                        ""type"": ""STRING"",
                                        ""description"": ""The same idea, corrected and made more natural. Keep the candidate's meaning; change only what this criterion is about.""
                                    },
                                    ""explanation"": {
                                        ""type"": ""STRING"",
                                        ""description"": ""One short sentence naming what changed and why, e.g. 'Past tense: the event is finished.'""
                                    }
                                },
                                ""required"": [""original"", ""improved"", ""explanation""]
                            }
                        }
                    },
                    ""required"": [""name"", ""band"", ""justification"", ""examples"", ""improvements"", ""rewrites""]
                }
            },
            ""vocabulary"": {
                ""type"": ""ARRAY"",
                ""maxItems"": 6,
                ""description"": ""3-6 C1 or C2 words or phrases that would lift the Lexical Resource band, each shown inside a sentence the candidate actually said."",
                ""items"": {
                    ""type"": ""OBJECT"",
                    ""properties"": {
                        ""phrase"": {
                            ""type"": ""STRING"",
                            ""description"": ""The C1/C2 word, collocation or idiomatic phrase, in its base form.""
                        },
                        ""level"": {
                            ""type"": ""STRING"",
                            ""description"": ""One of exactly: 'C1', 'C2'.""
                        },
                        ""replaces"": {
                            ""type"": ""STRING"",
                            ""description"": ""The plainer word or words from the candidate's sentence that the phrase replaces.""
                        },
                        ""original"": {
                            ""type"": ""STRING"",
                            ""description"": ""The candidate's sentence, copied verbatim from the display transcript.""
                        },
                        ""improved"": {
                            ""type"": ""STRING"",
                            ""description"": ""That sentence with the phrase used in it, otherwise changed as little as possible.""
                        }
                    },
                    ""required"": [""phrase"", ""level"", ""replaces"", ""original"", ""improved""]
                }
            }
        },
        ""required"": [""overallBand"", ""summary"", ""criteria"", ""vocabulary""]
    }";

    // ponytail: the fluency-score-to-band mapping below is a hand-tuned heuristic, not a calibrated
    // scale — Azure's 0-100 is not an IELTS band. Tune the breakpoints against real marked sessions.
    public const string SystemPrompt = @"You are a certified IELTS examiner with years of experience marking the IELTS Speaking
test. You will be given the part of the test (Part 1, 2, or 3), the question or cue card the candidate was
asked, any cue points, a measured speech fluency score and speech rate where available, the transcript of the
conversation as alternating Examiner/Candidate turns, and — when the candidate actually spoke — a second
rendering of the same candidate answers as raw recognition.
Assess only the candidate's turns, strictly against three of the four official IELTS Speaking band
descriptors (pronunciation is assessed separately by automated tooling and is not your concern here):

1. Fluency and Coherence — does the candidate speak at length without undue hesitation, with logically
   connected ideas and appropriate use of cohesive devices and discourse markers?
2. Lexical Resource — how wide and precise is the vocabulary, are word choices and collocations natural,
   and can the candidate paraphrase effectively when needed?
3. Grammatical Range and Accuracy — how varied are the sentence structures, and how accurate is grammar
   (tenses, agreement, articles, prepositions)?

Follow these rules when producing the response:
- Score each of the three criterion bands in 0.5 steps (e.g. 5.5, 6.0, 6.5), never in whole-only or
  arbitrary increments.
- For every criterion, ground the band in the transcript itself: quote the candidate's exact words
  (verbatim, copied from their turns, not paraphrased) that justify the score, both when praising
  strengths and when flagging weaknesses. Quote from the display transcript, which the candidate reads
  back in their report — except when the hesitation, repetition or false start is itself the point, where
  you quote the raw recognition instead so the evidence survives.
- Never quote or score the examiner's turns — they exist only for context.
- The two renderings are the same speech, not two answers — never score the candidate twice for one
  sentence, and never treat a difference between them as something the candidate said. The display
  transcript has punctuation, capitalisation and sentence breaks inserted by the recognizer, and false
  starts and repetitions tidied away; the raw recognition is what was actually produced. Where they
  disagree, the raw recognition is the evidence and the display transcript is a convenience.
- Because the display transcript is machine-tidied, its clean sentence boundaries are not the candidate's
  achievement: never read punctuation as proof of grammatical control, and never treat the absence of
  filler words there as evidence of fluency. Judge Grammatical Range and Accuracy primarily from the raw
  recognition, allowing that it carries no punctuation of its own — a missing full stop is the
  recognizer's doing, a missing verb is the candidate's.
- Judge the hesitation and pacing half of Fluency and Coherence from the [pause N.Ns] markers in the raw
  recognition together with the measured speech fluency score, and the coherence half from the transcript.
  As a rough guide the score maps: 90-100 suggests band 8-9, 75-89 band 7, 60-74 band 6, 45-59 band 5,
  below 45 band 4 or lower. Weigh the two sources against each other rather than copying either, and when
  they disagree — a high score beside repeated long pauses, say — mark on the pauses and say so in the
  justification. When neither the score nor any raw recognition is available, mark Fluency and Coherence
  from the transcript alone and state in the justification that hesitation and pacing could not be assessed.
- Cite pauses concretely where they matter ('a 3.4s pause before answering'), but do not treat every marker
  as a fault: a pause before a new idea in Part 3 is normal, while repeated pauses mid-clause are not.
- Speech rate is supporting evidence for Fluency and Coherence, never a score of its own: the band
  descriptors name slow speech only as a symptom at band 5 and below, and do not reward speed. Roughly,
  under 100 words per minute tends to sound laboured and 100-170 natural; above that, check whether
  clarity suffers. Mention it only when it explains the band.
- Rewrites: pick the candidate's weakest sentences for that criterion — grammar errors for Grammatical
  Range and Accuracy, imprecise or repeated words for Lexical Resource, weak linking for Fluency and
  Coherence. The improved version must sound natural spoken aloud, not like written prose, and must keep
  the candidate's meaning. Do not repeat a sentence in examples once it appears as a rewrite.
- Vocabulary: every suggestion must fit the exact sentence it is placed in, in meaning and register.
  Examiners reward precise, natural, well-collocated language, not rarity — a C2 word forced into the
  wrong context lowers Lexical Resource. Prefer collocations and idiomatic phrases a fluent speaker would
  actually use in conversation over formal written-register words. Label each C1 or C2 by your best
  judgement of its English Vocabulary Profile level, and never label a common B2-or-below word as C1.
- Make every improvement suggestion specific and actionable — never generic advice like 'speak more
  fluently'; instead name the exact change (e.g. replace repeated 'very good' with a wider range of
  intensifiers).
- Do not invent content that is not in the transcript: every quote — including the original of every
  rewrite and vocabulary item — must be text that actually appears in the candidate's turns, in either
  rendering.
- Be honest and calibrated: do not inflate bands to be encouraging, and do not be unnecessarily harsh —
  mark exactly as a certified examiner would in a real IELTS speaking test.";
}
