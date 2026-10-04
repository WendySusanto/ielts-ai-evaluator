namespace IELTS.AI.Evaluator.Functions.DTOs;

/// <summary>One of the three Gemini-scored IELTS speaking criteria for a single session.
/// Pronunciation is Azure PA's job (Phase 4) and is not part of this shape.
/// Rewrites is nullable because feedback is stored as jsonb and read back through this record:
/// sessions marked before rewrites existed have no such key, and must still open. NextBand is null
/// for the same reason on sessions before schema v2, and for a band of 9.</summary>
public record SpeakingCriterion(
    string Name,
    decimal Band,
    string Justification,
    List<string> Examples,
    List<string> Improvements,
    List<SpeakingRewrite>? Rewrites = null,
    SpeakingNextBand? NextBand = null);

/// <summary>One of the candidate's own sentences, and how a stronger speaker would say it.</summary>
public record SpeakingRewrite(string Original, string Improved, string Explanation);

/// <summary>Why a criterion is not yet at the next whole band: what that band's descriptor asks for
/// that the candidate did not show, and one step that closes the gap.</summary>
public record SpeakingNextBand(decimal Band, string Missing, string HowTo);

/// <summary>Feedback on one candidate answer. Answer is the 1-based number the transcript sent to
/// Gemini gives it ("Candidate (answer 2): ..."), counting candidate turns in conversation order.
/// Transcript is Gemini's verbatim transcription of that answer's recording — null when the answer
/// had none, and on sessions before schema v3.</summary>
public record SpeakingAnswerFeedback(int Answer, string Comment, string SampleAnswer, string? Transcript = null);

/// <summary>One grammar or word-choice mistake: the shortest verbatim stretch containing it, that
/// stretch corrected, its category, and the rule in one sentence.</summary>
public record SpeakingError(string Original, string Corrected, string Category, string Explanation);

/// <summary>A word the candidate clearly mispronounced in a recording: as meant, as it sounded, and
/// one tip. Explains the Azure pronunciation band; never replaces it.</summary>
public record SpeakingPronunciationNote(string Word, string HeardAs, string Tip);

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
    List<SpeakingVocabularyUpgrade>? Vocabulary = null, // null on sessions marked before it existed
    List<SpeakingAnswerFeedback>? Answers = null, // null on sessions before schema v2 (FeedbackVersion 1)
    List<SpeakingError>? Errors = null, // likewise
    List<SpeakingPronunciationNote>? PronunciationNotes = null); // null on sessions before schema v3

/// <summary>Gemini responseSchema + system prompt for SpeakingFeedback. Designed together
/// (spec §8), same discipline as Task 5's WritingFeedbackPrompts.</summary>
public static class SpeakingFeedbackPrompts
{
    public const string GeminiSchema = @"{
        ""type"": ""OBJECT"",
        ""properties"": {
            ""answers"": {
                ""type"": ""ARRAY"",
                ""description"": ""One entry per candidate answer, in conversation order, numbered exactly as the transcript numbers them."",
                ""items"": {
                    ""type"": ""OBJECT"",
                    ""properties"": {
                        ""answer"": {
                            ""type"": ""INTEGER"",
                            ""description"": ""The answer's number from the transcript, as in 'Candidate (answer 2)'.""
                        },
                        ""transcript"": {
                            ""type"": ""STRING"",
                            ""nullable"": true,
                            ""description"": ""Only for an answer with a recording: what the candidate said in it, verbatim — fillers, repetitions and false starts kept, grammar and word choice left exactly as spoken, sentence punctuation added. Null when the answer has no recording.""
                        },
                        ""comment"": {
                            ""type"": ""STRING"",
                            ""description"": ""1-3 sentences on how well this answer responds to its question: what worked, and the single most useful thing it was missing.""
                        },
                        ""sampleAnswer"": {
                            ""type"": ""STRING"",
                            ""description"": ""How a band 7 candidate might answer the same question aloud, in natural spoken English. At most 80 words for Part 1 and Part 3, at most 150 for the Part 2 long turn.""
                        }
                    },
                    ""required"": [""answer"", ""transcript"", ""comment"", ""sampleAnswer""],
                    ""propertyOrdering"": [""answer"", ""transcript"", ""comment"", ""sampleAnswer""]
                }
            },
            ""errors"": {
                ""type"": ""ARRAY"",
                ""maxItems"": 15,
                ""description"": ""Up to 15 of the candidate's grammar and word-choice mistakes, most impactful first. Empty when there are none."",
                ""items"": {
                    ""type"": ""OBJECT"",
                    ""properties"": {
                        ""original"": {
                            ""type"": ""STRING"",
                            ""description"": ""The shortest stretch of the candidate's words that contains the mistake, copied verbatim from the transcript.""
                        },
                        ""corrected"": {
                            ""type"": ""STRING"",
                            ""description"": ""That same stretch with the mistake fixed and nothing else changed.""
                        },
                        ""category"": {
                            ""type"": ""STRING"",
                            ""enum"": [""tense"", ""article"", ""agreement"", ""preposition"", ""word form"", ""word choice"", ""plural"", ""word order"", ""other""],
                            ""description"": ""The kind of mistake; 'other' only when none of the rest fits.""
                        },
                        ""explanation"": {
                            ""type"": ""STRING"",
                            ""description"": ""One short sentence naming the rule, e.g. 'Past simple: the trip is finished.'""
                        }
                    },
                    ""required"": [""original"", ""corrected"", ""category"", ""explanation""],
                    ""propertyOrdering"": [""original"", ""corrected"", ""category"", ""explanation""]
                }
            },
            ""pronunciationNotes"": {
                ""type"": ""ARRAY"",
                ""maxItems"": 6,
                ""description"": ""Up to 6 words the candidate clearly mispronounced in the recordings, in a way that could confuse a listener. Empty when there are no recordings or nothing stands out."",
                ""items"": {
                    ""type"": ""OBJECT"",
                    ""properties"": {
                        ""word"": {
                            ""type"": ""STRING"",
                            ""description"": ""The word as the candidate meant it.""
                        },
                        ""heardAs"": {
                            ""type"": ""STRING"",
                            ""description"": ""How it sounded, spelled the way an English listener would hear it, e.g. 'scenary'.""
                        },
                        ""tip"": {
                            ""type"": ""STRING"",
                            ""description"": ""One short, concrete tip for saying it, e.g. 'Stress the first syllable: SEE-nuh-ree.'""
                        }
                    },
                    ""required"": [""word"", ""heardAs"", ""tip""],
                    ""propertyOrdering"": [""word"", ""heardAs"", ""tip""]
                }
            },
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
                            ""enum"": [""FluencyCoherence"", ""LexicalResource"", ""GrammaticalRangeAccuracy""],
                            ""description"": ""The criterion's key, in the order given above.""
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
                        ""nextBand"": {
                            ""type"": ""OBJECT"",
                            ""nullable"": true,
                            ""description"": ""Why this criterion is not yet at the next whole band above its band (6.0 or 6.5 -> 7, 7.0 or 7.5 -> 8). Null only when the band is 9."",
                            ""properties"": {
                                ""band"": {
                                    ""type"": ""NUMBER"",
                                    ""description"": ""The next whole band above this criterion's band.""
                                },
                                ""missing"": {
                                    ""type"": ""STRING"",
                                    ""description"": ""What the official descriptor for that band requires that the candidate did not yet show, quoting verbatim where the answer fell short.""
                                },
                                ""howTo"": {
                                    ""type"": ""STRING"",
                                    ""description"": ""One concrete step that would close that gap in the next practice session.""
                                }
                            },
                            ""required"": [""band"", ""missing"", ""howTo""],
                            ""propertyOrdering"": [""band"", ""missing"", ""howTo""]
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
                                        ""description"": ""The candidate's sentence, copied verbatim from your transcript of the recording where the answer has one, otherwise from the display transcript.""
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
                                ""required"": [""original"", ""improved"", ""explanation""],
                                ""propertyOrdering"": [""original"", ""improved"", ""explanation""]
                            }
                        }
                    },
                    ""required"": [""name"", ""band"", ""justification"", ""examples"", ""improvements"", ""rewrites"", ""nextBand""],
                    ""propertyOrdering"": [""name"", ""justification"", ""examples"", ""band"", ""nextBand"", ""improvements"", ""rewrites""]
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
                            ""enum"": [""C1"", ""C2""],
                            ""description"": ""Your best estimate of the phrase's English Vocabulary Profile level.""
                        },
                        ""replaces"": {
                            ""type"": ""STRING"",
                            ""description"": ""The plainer word or words from the candidate's sentence that the phrase replaces.""
                        },
                        ""original"": {
                            ""type"": ""STRING"",
                            ""description"": ""The candidate's sentence, copied verbatim from your transcript of the recording where the answer has one, otherwise from the display transcript.""
                        },
                        ""improved"": {
                            ""type"": ""STRING"",
                            ""description"": ""That sentence with the phrase used in it, otherwise changed as little as possible.""
                        }
                    },
                    ""required"": [""phrase"", ""level"", ""replaces"", ""original"", ""improved""],
                    ""propertyOrdering"": [""phrase"", ""level"", ""replaces"", ""original"", ""improved""]
                }
            }
        },
        ""required"": [""overallBand"", ""summary"", ""criteria"", ""vocabulary"", ""answers"", ""errors"", ""pronunciationNotes""],
        ""propertyOrdering"": [""answers"", ""errors"", ""pronunciationNotes"", ""criteria"", ""vocabulary"", ""summary"", ""overallBand""]
    }";

    // ponytail: the fluency-score-to-band mapping below is a hand-tuned heuristic, not a calibrated
    // scale — Azure's 0-100 is not an IELTS band. Tune the breakpoints against real marked sessions.
    public const string SystemPrompt = @"You are a certified IELTS examiner with years of experience marking the IELTS Speaking
test. You will be given the part of the test (Part 1, 2, or 3), the question or cue card the candidate was
asked, any cue points, a measured speech fluency score and speech rate where available, the transcript of the
conversation as alternating Examiner/Candidate turns with each candidate answer numbered ('Candidate (answer 2): ...'), and — when the candidate actually spoke — a second
rendering of the same candidate answers as raw recognition. Answers recorded in the browser also carry the
candidate's own voice: an audio part placed right after the line 'Recording of answer N:'.
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
  strengths and when flagging weaknesses. Quote from your transcript of the recording where the answer has
  one and otherwise from the display transcript — that is what the candidate reads back in their report —
  except when the hesitation, repetition or false start is itself the point, where you quote the raw
  recognition instead so the evidence survives.
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
- Both renderings come from automatic speech recognition of non-native speech, so some words are
  misheard. When a word or phrase makes no sense in context but sounds like one that clearly does
  ('my stories was full' for 'my storage was full', 'make up the photos' for 'back up the photos'), treat
  it as a recognition error: do not count it against Lexical Resource or Grammatical Range and Accuracy,
  and never quote it as the candidate's mistake or pick it for a rewrite or vocabulary suggestion. Only
  do this when the intended word is obvious from context; a genuinely wrong word choice or form is still
  the candidate's.
- Recordings: where an answer has one, the recording is the evidence of what the candidate said, and
  both recognizer renderings are machine transcriptions of it that may mishear words. Write that answer's
  transcript from the recording, verbatim — keep fillers ('uh', 'eee'), repetitions and false starts, add
  sentence punctuation, and leave grammar and word choice exactly as spoken — and judge Lexical Resource
  and Grammatical Range and Accuracy from it. Keep reading pause lengths from the [pause N.Ns] markers,
  which come from timing data. Answers without a recording keep a null transcript and are judged from
  the recognizer renderings as above.
- Pronunciation notes: from the recordings only, list up to six words the candidate clearly
  mispronounced in a way that could confuse a listener — the word as meant, how it sounded, and one
  concrete tip. Never infer pronunciation from recognizer text, and leave the list empty when there are
  no recordings. The pronunciation band itself comes from separate acoustic scoring; these notes only
  explain it.
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
  rewrite, vocabulary item and error — must be text that actually appears in the candidate's turns, in
  either rendering.
- Work through the evidence before any verdict: the answers first, then the mistakes, then each
  criterion's justification and examples, and only then its band.
- Answers: one entry per numbered candidate answer, using the same number. The comment says, in one to
  three sentences, how well the answer responds to its question — what worked, and the single most
  useful thing it was missing (a reason, an example, an extension, a clearer link back to the question).
  The sample answer shows how a band 7 candidate might answer the same question aloud: natural spoken
  English with contractions and discourse markers, no written-register words, keeping the candidate's
  own ideas where they work. At most 80 words for a Part 1 or Part 3 question, at most 150 for the Part 2
  long turn. It is a model to learn from, never a claim about what the candidate said.
- Next band: for each criterion, name the next whole band above the one you gave (6.0 or 6.5 -> 7,
  7.0 or 7.5 -> 8). In missing, say what the official descriptor for that band requires that this
  candidate did not yet show, quoting verbatim where the answer fell short; in howTo, give one concrete
  step that would close the gap. Use null only for a band of 9. This comparison keeps the band honest:
  if the candidate already meets the next band's descriptor, the band you gave is too low.
- Errors: list the candidate's grammar and word-choice mistakes, most impactful first, at most 15.
  Original is the shortest verbatim stretch of the transcript that contains the mistake; corrected is
  that stretch fixed and nothing else. Recognition errors (see above) are not the candidate's mistakes and
  never appear here. A sentence whose only problem is already listed here should not also be a
  Grammatical Range and Accuracy rewrite — rewrites are for sentences that also gain range or naturalness.
- Be honest and calibrated: do not inflate bands to be encouraging, and do not be unnecessarily harsh —
  mark exactly as a certified examiner would in a real IELTS speaking test.";
}
