using IELTS.AI.Evaluator.Functions.Exceptions;
using IELTS.AI.Evaluator.Functions.Middleware;

namespace IELTS.AI.Evaluator.Tests;

// ponytail: tests the extracted Map() instead of faking FunctionContext/HttpRequestData —
// the isolated-worker HTTP plumbing (CreateResponse/WriteAsJsonAsync) is host-owned; the
// wire contract we own is exactly this exception → (status, message) mapping.
public class ExceptionHandlingMiddlewareTests
{
    [Theory]
    [InlineData(typeof(ValidationException), 400)]
    [InlineData(typeof(NotFoundException), 404)]
    [InlineData(typeof(QuotaExceededException), 429)]
    [InlineData(typeof(ForbiddenException), 403)]
    public void DomainException_MapsToItsStatusAndMessage(Type exceptionType, int expectedStatus)
    {
        var ex = (Exception)Activator.CreateInstance(exceptionType, "boom")!;
        var (status, message, isDomain) = ExceptionHandlingMiddleware.Map(ex);
        Assert.Equal(expectedStatus, status);
        Assert.Equal("boom", message);
        Assert.True(isDomain);
    }

    [Fact]
    public void WrappedDomainException_IsUnwrapped()
    {
        var wrapped = new InvalidOperationException("pipeline wrapper", new NotFoundException("Speaking session not found."));
        var (status, message, isDomain) = ExceptionHandlingMiddleware.Map(wrapped);
        Assert.Equal(404, status);
        Assert.Equal("Speaking session not found.", message);
        Assert.True(isDomain);
    }

    [Fact]
    public void UnknownException_MapsTo500_WithoutLeakingDetail()
    {
        var (status, message, isDomain) = ExceptionHandlingMiddleware.Map(new InvalidOperationException("secret internals"));
        Assert.Equal(500, status);
        Assert.Equal("Internal server error", message);
        Assert.False(isDomain);
    }
}
