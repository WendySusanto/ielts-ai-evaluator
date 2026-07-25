namespace IELTS.AI.Evaluator.Functions.DTOs;

/// <summary>One of the three Gemini-scored IELTS speaking criteria for a single session.
/// Pronunciation is Azure PA's job (Phase 4) and is not part of this shape.</summary>
public record SpeakingCriterion(
    string Name,
    decimal Band,
    string Justification,
    List<string> Examples,
    List<string> Improvements);

/// <summary>One turn of the conversation. Role: "examiner" | "candidate".</summary>
public record SpeakingTurn(string Role, string Text);

/// <summary>One word from Azure Pronunciation Assessment's per-word breakdown.</summary>
public record PronunciationWord(string Word, decimal AccuracyScore, string ErrorType);

/// <summary>Azure Pronunciation Assessment result, aggregated client-side across candidate turns
/// and submitted with the final evaluation. Band is always server-recomputed from
/// PronunciationScore — never trust a client-supplied value.</summary>
public record PronunciationResult(
    decimal Band,
    decimal PronunciationScore,
    decimal AccuracyScore,
    decimal FluencyScore,
    decimal ProsodyScore,
    decimal CompletenessScore,
    List<PronunciationWord> Words);

/// <summary>Deep structured feedback for one speaking session. camelCase on the wire —
/// this is also the contract for the Phase 3 feedback screens. OverallBand here is the
/// service-computed average of the three criteria below, rounded to the nearest 0.5 —
/// not necessarily whatever Gemini put in its own overallBand field.</summary>
public record SpeakingFeedback(
    decimal OverallBand,
    string Summary,
    List<SpeakingCriterion> Criteria); // exactly 3 from Gemini: FluencyCoherence, LexicalResource, GrammaticalRangeAccuracy

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
                        }
                    },
                    ""required"": [""name"", ""band"", ""justification"", ""examples"", ""improvements""]
                }
            }
        },
        ""required"": [""overallBand"", ""summary"", ""criteria""]
    }";

    // ponytail: the fluency-score-to-band mapping below is a hand-tuned heuristic, not a calibrated
    // scale — Azure's 0-100 is not an IELTS band. Tune the breakpoints against real marked sessions.
    public const string SystemPrompt = @"You are a certified IELTS examiner with years of experience marking the IELTS Speaking
test. You will be given the part of the test (Part 1, 2, or 3), the question or cue card the candidate was
asked, any cue points, a measured speech fluency score where one is available, and the transcript of the
conversation as alternating Examiner/Candidate turns.
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
  strengths and when flagging weaknesses.
- Never quote or score the examiner's turns — they exist only for context.
- The transcript is machine-generated from speech and display-formatted: filler words ('um', 'uh'), false
  starts and repetitions are largely stripped out, and punctuation is inserted automatically. Never treat
  their absence as evidence of fluency, and never quote a filler word that does not appear in the text.
- Judge the coherence half of Fluency and Coherence from the transcript, but judge the hesitation and
  pacing half from the measured speech fluency score, which is the only evidence you have of pauses.
  As a rough guide: 90-100 suggests band 8-9, 75-89 band 7, 60-74 band 6, 45-59 band 5, below 45 band 4
  or lower. Weigh it against coherence rather than copying it, and when the two disagree, say so in the
  justification. When the score is reported as not available, mark Fluency and Coherence from the
  transcript alone and state in the justification that hesitation and pacing could not be assessed.
- Make every improvement suggestion specific and actionable — never generic advice like 'speak more
  fluently'; instead name the exact change (e.g. replace repeated 'very good' with a wider range of
  intensifiers).
- Do not invent content that is not in the transcript: every quote must be text that actually appears in
  the candidate's turns.
- Be honest and calibrated: do not inflate bands to be encouraging, and do not be unnecessarily harsh —
  mark exactly as a certified examiner would in a real IELTS speaking test.";
}
