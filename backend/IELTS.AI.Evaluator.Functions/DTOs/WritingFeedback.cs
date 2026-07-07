namespace IELTS.AI.Evaluator.Functions.DTOs;

/// <summary>One of the four official IELTS writing criteria for a single essay.</summary>
public record WritingCriterion(
    string Name,
    decimal Band,
    string Justification,
    List<string> Examples,
    List<string> Improvements);

/// <summary>A specific grammar/vocabulary/spelling mistake, quoted verbatim from the essay.</summary>
public record WritingError(string Quote, string Correction, string Rule);

/// <summary>A word/phrase from the essay paired with a stronger alternative.</summary>
public record VocabularyUpgrade(string Original, string Upgrade, string Context);

/// <summary>Deep structured feedback for one writing evaluation. camelCase on the wire —
/// this is also the contract for the Phase 3 feedback screens.</summary>
public record WritingFeedback(
    decimal OverallBand,
    string Summary,
    List<WritingCriterion> Criteria,          // exactly 4: TaskAchievement/TaskResponse, CoherenceCohesion, LexicalResource, GrammaticalRangeAccuracy
    List<WritingError> Errors,
    List<VocabularyUpgrade> VocabularyUpgrades,
    string ImprovedExcerpt);

/// <summary>Gemini responseSchema + system prompt for WritingFeedback. Designed together
/// (spec §8): every field the schema demands, the prompt explains how to fill well.</summary>
public static class WritingFeedbackPrompts
{
    public const string GeminiSchema = @"{
        ""type"": ""OBJECT"",
        ""properties"": {
            ""overallBand"": {
                ""type"": ""NUMBER"",
                ""description"": ""Overall band score for the essay, 0-9 in 0.5 increments, reflecting the standard IELTS weighting of the four criteria below.""
            },
            ""summary"": {
                ""type"": ""STRING"",
                ""description"": ""A 2-4 sentence plain-English summary of the candidate's overall performance, naming the single biggest lever for improving the band score.""
            },
            ""criteria"": {
                ""type"": ""ARRAY"",
                ""minItems"": 4,
                ""maxItems"": 4,
                ""description"": ""Exactly four entries, one per official IELTS writing criterion, in this order: Task Achievement (Task 1) or Task Response (Task 2), Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy."",
                ""items"": {
                    ""type"": ""OBJECT"",
                    ""properties"": {
                        ""name"": {
                            ""type"": ""STRING"",
                            ""description"": ""One of exactly: 'TaskAchievement' (Task 1 prompts) or 'TaskResponse' (Task 2 prompts), 'CoherenceCohesion', 'LexicalResource', 'GrammaticalRangeAccuracy'.""
                        },
                        ""band"": {
                            ""type"": ""NUMBER"",
                            ""description"": ""This criterion's band, 0-9 in 0.5 steps, assessed independently against the official IELTS band descriptors for this criterion.""
                        },
                        ""justification"": {
                            ""type"": ""STRING"",
                            ""description"": ""2-4 sentences explaining the band, citing specific evidence quoted verbatim from the essay.""
                        },
                        ""examples"": {
                            ""type"": ""ARRAY"",
                            ""items"": { ""type"": ""STRING"" },
                            ""description"": ""1-3 short direct quotes copied verbatim from the essay that illustrate this criterion's strengths or weaknesses.""
                        },
                        ""improvements"": {
                            ""type"": ""ARRAY"",
                            ""items"": { ""type"": ""STRING"" },
                            ""description"": ""1-3 specific, actionable changes the candidate can make to raise this criterion's band, each concrete enough to apply to the next essay.""
                        }
                    },
                    ""required"": [""name"", ""band"", ""justification"", ""examples"", ""improvements""]
                }
            },
            ""errors"": {
                ""type"": ""ARRAY"",
                ""description"": ""Every notable grammar, spelling, punctuation, or word-choice error found in the essay, each tied to an exact quote."",
                ""items"": {
                    ""type"": ""OBJECT"",
                    ""properties"": {
                        ""quote"": {
                            ""type"": ""STRING"",
                            ""description"": ""The exact phrase or sentence from the essay, quoted verbatim, that contains the error.""
                        },
                        ""correction"": {
                            ""type"": ""STRING"",
                            ""description"": ""The same phrase or sentence, corrected.""
                        },
                        ""rule"": {
                            ""type"": ""STRING"",
                            ""description"": ""The grammar, spelling, or usage rule that was broken, explained simply enough for a learner to apply it elsewhere.""
                        }
                    },
                    ""required"": [""quote"", ""correction"", ""rule""]
                }
            },
            ""vocabularyUpgrades"": {
                ""type"": ""ARRAY"",
                ""description"": ""Words or phrases from the essay that are correct but basic, each paired with a stronger, more precise, higher-band alternative."",
                ""items"": {
                    ""type"": ""OBJECT"",
                    ""properties"": {
                        ""original"": {
                            ""type"": ""STRING"",
                            ""description"": ""The word or phrase exactly as it appears in the essay.""
                        },
                        ""upgrade"": {
                            ""type"": ""STRING"",
                            ""description"": ""A stronger, more precise, or more natural alternative that fits the same sentence.""
                        },
                        ""context"": {
                            ""type"": ""STRING"",
                            ""description"": ""The full sentence from the essay, quoted verbatim, in which the original word or phrase appears.""
                        }
                    },
                    ""required"": [""original"", ""upgrade"", ""context""]
                }
            },
            ""improvedExcerpt"": {
                ""type"": ""STRING"",
                ""description"": ""One paragraph taken from the essay and rewritten at a higher band (stronger vocabulary, tighter grammar, clearer cohesion), so the candidate can see the target quality directly next to their own writing.""
            }
        },
        ""required"": [""overallBand"", ""summary"", ""criteria"", ""errors"", ""vocabularyUpgrades"", ""improvedExcerpt""]
    }";

    public const string SystemPrompt = @"You are a certified IELTS examiner with years of experience marking both
Academic and General Training Writing tasks. You will be given the task type, the question the
candidate was asked, an image description (for Task 1 charts/graphs/processes, when present), and the
candidate's essay. Assess the essay strictly against the four official IELTS Writing band descriptors:

1. Task Achievement (Task 1) / Task Response (Task 2) — does the essay fully address every part of the
   question, take a clear and relevant position, and develop ideas with sufficient, relevant support?
2. Coherence and Cohesion — is the essay logically organized into paragraphs, with ideas that progress
   clearly and cohesive devices (linking words, referencing) used accurately and naturally, not
   mechanically overused?
3. Lexical Resource — how wide and precise is the vocabulary, are word choices and collocations natural,
   and how accurate is spelling?
4. Grammatical Range and Accuracy — how varied are the sentence structures, and how accurate is grammar
   (tenses, agreement, articles, prepositions)?

Follow these rules when producing the response:
- Score the overall band and each of the four criterion bands in 0.5 steps (e.g. 5.5, 6.0, 6.5), never
  in whole-only or arbitrary increments.
- For every criterion, ground the band in the essay itself: quote the exact words or sentences (verbatim,
  copy-pasted from the essay text, not paraphrased) that justify the score, both when praising strengths
  and when flagging weaknesses.
- For every entry in errors, quote the exact erroneous phrase from the essay verbatim, give the corrected
  version, and explain the underlying rule simply enough that the candidate can apply it to a different
  sentence next time.
- For every entry in vocabularyUpgrades, quote the original word or phrase and its surrounding sentence
  verbatim from the essay, then suggest a natural, higher-band alternative that would fit in that exact
  sentence.
- Make every improvement suggestion specific and actionable — never generic advice like 'use better
  vocabulary' or 'be more coherent'; instead name the exact change (e.g. replace ""very big"" with
  ""substantial"" in the second sentence of paragraph 2).
- The improvedExcerpt must be a real paragraph lifted from the candidate's own essay and rewritten at a
  noticeably higher band, so the candidate can compare it directly with what they wrote.
- Do not invent content that is not in the essay: every quote must be text that actually appears in the
  submitted essay.
- Be honest and calibrated: do not inflate bands to be encouraging, and do not be unnecessarily harsh —
  mark exactly as a certified examiner would in a real IELTS test.";
}
