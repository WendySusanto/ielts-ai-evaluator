using System.Text.Json;
using System.Text.Json.Nodes;

namespace IELTS.AI.Evaluator.Functions.Constants
{
    public static class GeminiSchemas
    {
        private const string IeltsEvaluationSchemaJson = @"{
            ""type"": ""object"",
            ""properties"": {
                ""overallBand"": { ""type"": ""number"" },
                ""criteria"": {
                    ""type"": ""object"",
                    ""properties"": {
                        ""taskResponse"": {
                            ""type"": ""object"",
                            ""properties"": {
                                ""band"": { ""type"": ""number"" },
                                ""generalFeedback"": { ""type"": ""string"" },
                                ""subScores"": {
                                    ""type"": ""object"",
                                    ""properties"": {
                                        ""addressAllPartsOfQuestion"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        },
                                        ""clearOpinionIfRequired"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        },
                                        ""wellDevelopedIdeas"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        },
                                        ""examplesAndSupport"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        }
                                    },
                                    ""required"": [""addressAllPartsOfQuestion"", ""clearOpinionIfRequired"", ""wellDevelopedIdeas"", ""examplesAndSupport""]
                                },
                                ""issues"": {
                                    ""type"": ""array"",
                                    ""items"": {
                                        ""type"": ""object"",
                                        ""properties"": {
                                            ""text"": { ""type"": ""string"" },
                                            ""comment"": { ""type"": ""string"" }
                                        },
                                        ""required"": [""text"", ""comment""]
                                    }
                                }
                            },
                            ""required"": [""band"", ""generalFeedback"", ""subScores"", ""issues""]
                        },
                        ""coherenceCohesion"": {
                            ""type"": ""object"",
                            ""properties"": {
                                ""band"": { ""type"": ""number"" },
                                ""generalFeedback"": { ""type"": ""string"" },
                                ""subScores"": {
                                    ""type"": ""object"",
                                    ""properties"": {
                                        ""logicalFlowOfIdeas"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        },
                                        ""paragraphing"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        },
                                        ""cohesiveDevices"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        },
                                        ""referencingClarity"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        }
                                    },
                                    ""required"": [""logicalFlowOfIdeas"", ""paragraphing"", ""cohesiveDevices"", ""referencingClarity""]
                                },
                                ""issues"": {
                                    ""type"": ""array"",
                                    ""items"": {
                                        ""type"": ""object"",
                                        ""properties"": {
                                            ""text"": { ""type"": ""string"" },
                                            ""comment"": { ""type"": ""string"" }
                                        },
                                        ""required"": [""text"", ""comment""]
                                    }
                                }
                            },
                            ""required"": [""band"", ""generalFeedback"", ""subScores"", ""issues""]
                        },
                        ""lexicalResource"": {
                            ""type"": ""object"",
                            ""properties"": {
                                ""band"": { ""type"": ""number"" },
                                ""generalFeedback"": { ""type"": ""string"" },
                                ""subScores"": {
                                    ""type"": ""object"",
                                    ""properties"": {
                                        ""vocabularyRange"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        },
                                        ""wordChoiceAccuracy"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        },
                                        ""collocations"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        },
                                        ""spelling"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        }
                                    },
                                    ""required"": [""vocabularyRange"", ""wordChoiceAccuracy"", ""collocations"", ""spelling""]
                                },
                                ""issues"": {
                                    ""type"": ""array"",
                                    ""items"": {
                                        ""type"": ""object"",
                                        ""properties"": {
                                            ""text"": { ""type"": ""string"" },
                                            ""comment"": { ""type"": ""string"" }
                                        },
                                        ""required"": [""text"", ""comment""]
                                    }
                                }
                            },
                            ""required"": [""band"", ""generalFeedback"", ""subScores"", ""issues""]
                        },
                        ""grammaticalRangeAccuracy"": {
                            ""type"": ""object"",
                            ""properties"": {
                                ""band"": { ""type"": ""number"" },
                                ""generalFeedback"": { ""type"": ""string"" },
                                ""subScores"": {
                                    ""type"": ""object"",
                                    ""properties"": {
                                        ""sentenceVariety"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        },
                                        ""tenseAccuracy"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        },
                                        ""subjectVerbAgreement"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        },
                                        ""articleAndPrepositionUse"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        },
                                        ""errorDensity"": {
                                            ""type"": ""object"",
                                            ""properties"": {
                                                ""score"": { ""type"": ""number"" },
                                                ""comment"": { ""type"": ""string"" }
                                            },
                                            ""required"": [""score"", ""comment""]
                                        }
                                    },
                                    ""required"": [""sentenceVariety"", ""tenseAccuracy"", ""subjectVerbAgreement"", ""articleAndPrepositionUse"", ""errorDensity""]
                                },
                                ""issues"": {
                                    ""type"": ""array"",
                                    ""items"": {
                                        ""type"": ""object"",
                                        ""properties"": {
                                            ""text"": { ""type"": ""string"" },
                                            ""comment"": { ""type"": ""string"" }
                                        },
                                        ""required"": [""text"", ""comment""]
                                    }
                                }
                            },
                            ""required"": [""band"", ""generalFeedback"", ""subScores"", ""issues""]
                        }
                    },
                    ""required"": [""taskResponse"", ""coherenceCohesion"", ""lexicalResource"", ""grammaticalRangeAccuracy""]
                }
            },
            ""required"": [""overallBand"", ""criteria""]
        }";

        public static JsonNode IeltsEvaluationSchema => JsonNode.Parse(IeltsEvaluationSchemaJson)!;
    }
}
