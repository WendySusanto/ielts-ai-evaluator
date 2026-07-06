using IELTS.AI.Evaluator.Functions.Exceptions;

namespace IELTS.AI.Evaluator.Tests;

public class DomainExceptionTests
{
    [Theory]
    [InlineData(typeof(ValidationException), 400)]
    [InlineData(typeof(NotFoundException), 404)]
    [InlineData(typeof(QuotaExceededException), 429)]
    [InlineData(typeof(ForbiddenException), 403)]
    public void StatusCodes_MatchContract(Type type, int expected)
    {
        var ex = (DomainException)Activator.CreateInstance(type, "boom")!;
        Assert.Equal(expected, ex.StatusCode);
        Assert.Equal("boom", ex.Message);
    }
}
