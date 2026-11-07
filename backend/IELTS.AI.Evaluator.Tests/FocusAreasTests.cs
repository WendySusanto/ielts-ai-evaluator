using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.Extensions.ObjectPool;
using static IELTS.AI.Evaluator.Functions.Services.FocusAreas;

public class FocusAreasTests
{
    [Fact]
    public void Compute_ReturnsNullWritingFocus_WhenNoWritingEvaluations()
    {
        // Arrange
        var writing = new List<Evaluation>();   // empty list
        var speaking = new List<Evaluation>();

        // Act
        var result = Compute(writing, speaking);

        // Assert
        Assert.Null(result.Writing);
    }

    [Fact]
    public void Compute_PicksCriterionWithLowestAverageBand()
    {
        // Arrange
        var writing = new List<Evaluation>
        {
            new(new DateTime(2026, 11, 7),
                [ new Scored("LexicalResource", 6.0m, null),
                new Scored("CoherenceCohesion", 7.0m, null) ],
                []),
            new(new DateTime(2026, 11, 6),
                [ new Scored("LexicalResource", 7.0m, null),
                new Scored("CoherenceCohesion", 7.0m, null) ],
                []),
        };
        var speaking = new List<Evaluation>();

        // Act
        var result = Compute(writing, speaking);

        // Assert
        Assert.NotNull(result.Writing);

        Assert.Equal("LexicalResource", result.Writing!.Name);

        Assert.Equal(6.5m, result.Writing.Band);
    }


    [Fact]
    public void Compute_BreaksTieByOfficialOrder()
    {
        // Arrange
        var writing = new List<Evaluation>
        {
            new(new DateTime(2026, 11, 7),
                [ new Scored("GrammaticalRangeAccuracy", 6.0m, null),
                new Scored("CoherenceCohesion", 6.0m, null), ],
                [])
        };
        var speaking = new List<Evaluation>();

        // Act
        var result = Compute(writing, speaking);

        // Assert
        Assert.NotNull(result.Writing);

        Assert.Equal("CoherenceCohesion", result.Writing!.Name);
    }


    [Fact]
    public void Compute_ExcludesMistakeCategoriesSeenOnlyOnce()
    {
        // Arrange
        // Arrange
        var writing = new List<Evaluation>
        {
        new(new DateTime(2026, 11, 7),
            [ new Scored("LexicalResource", 6.0m, null) ],
            [ new Mistake("grammar", "he go", "he goes"),
            new Mistake("spelling", "recieve", "receive") ]),

        new(new DateTime(2026, 11, 6),
            [ new Scored("LexicalResource", 6.0m, null) ],
            [ new Mistake("grammar", "they was", "they were") ]),
        };

        var speaking = new List<Evaluation>();

        // Act
        var result = Compute(writing, speaking);


        //Assert
        var mistake = Assert.Single(result.Mistakes);   // exactly 1 category, and gives it back

        Assert.Equal("grammar", mistake.Category);
        Assert.Equal(2, mistake.Count);                 // the DTO's Count property, not the list's
        Assert.Equal("he go", mistake.Original);
    }



    [Fact]
    public void Compute_ExcludesOtherCategory()
    {
        // Arrange
        var writing = new List<Evaluation>
        {
            new(new DateTime(2026, 11, 7),
                [ new Scored("LexicalResource", 6.0m, null) ],
                [ new Mistake("other", "very good", "excellent"),
                new Mistake("other", "a lot of", "numerous") ]),

            new(new DateTime(2026, 11, 6),
                [ new Scored("LexicalResource", 6.0m, null) ],
                [ new Mistake("other", "things", "factors") ]),
        };
        var speaking = new List<Evaluation>();

        // Act
        var result = Compute(writing, speaking);


        //Assert
        Assert.Empty(result.Mistakes);
    }

    [Fact]
    public void Compute_ReturnsAtMostThreeMistakeCategories()
    {
        // Arrange
        var mistakes = new List<Mistake>();
        mistakes.AddRange(Enumerable.Repeat(new Mistake("grammar", "he go", "he goes"), 5));
        mistakes.AddRange(Enumerable.Repeat(new Mistake("vocabulary", "big", "large"), 4));
        mistakes.AddRange(Enumerable.Repeat(new Mistake("punctuation", "however", "however,"), 3));
        mistakes.AddRange(Enumerable.Repeat(new Mistake("spelling", "recieve", "receive"), 2));

        var writing = new List<Evaluation>
        {
            new(new DateTime(2026, 11, 7),
                [ new Scored("LexicalResource", 6.0m, null) ],
                mistakes),
        };
        var speaking = new List<Evaluation>();

        // Act
        var result = Compute(writing, speaking);


        //Assert
        Assert.Equal(3, result.Mistakes.Count());
        Assert.Equal(5, result.Mistakes[0].Count);
        Assert.Equal(4, result.Mistakes[1].Count);
        Assert.Equal(3, result.Mistakes[2].Count);

        Assert.DoesNotContain(result.Mistakes, m => m.Category == "spelling");

    }


    [Theory]
    [InlineData("TaskAchievement", TaskCriterion)]
    [InlineData("TaskResponse", TaskCriterion)]
    [InlineData("LexicalResource", "LexicalResource")]
    public void FromWriting_MapsCriterionName(string inputName, string expectedName)
    {
        // Arrange
        var feedback = new WritingFeedback(
            OverallBand: 6.5m,
            Summary: "test",
            Criteria: [new WritingCriterion(inputName, 6.5m, "justification", [], ["tip"])],
            Errors: [],
            VocabularyUpgrades: [],
            ImprovedExcerpt: "test");

        // Act
        var result = FromWriting(new DateTime(2026, 8, 12), feedback);

        // Assert
        var criterion = Assert.Single(result.Criteria);
        Assert.Equal(expectedName, criterion.Name);
        Assert.Equal("tip", criterion.Tip);
    }

    [Fact]
    public void Compute_RoundsWeakestBandToOneDecimal()
    {
        // Arrange
        var writing = new List<Evaluation>
        {
            new(new DateTime(2026, 11, 7),
                [ new Scored("LexicalResource", 6.0m, null) ],
                []),

            new(new DateTime(2026, 11, 6),
                [ new Scored("LexicalResource", 6.0m, null) ],
                []),

            new(new DateTime(2026, 11, 5),
                [ new Scored("LexicalResource", 6.5m, null) ],
                []),
        };
        var speaking = new List<Evaluation>();

        // Act
        var result = Compute(writing, speaking);

        // Assert
        Assert.NotNull(result.Writing);
        Assert.Equal("LexicalResource", result.Writing!.Name);
        Assert.Equal(6.2m, result.Writing.Band);

    }

}