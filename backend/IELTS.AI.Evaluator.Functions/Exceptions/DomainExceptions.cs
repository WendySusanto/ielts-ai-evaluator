namespace IELTS.AI.Evaluator.Functions.Exceptions;

public abstract class DomainException : Exception
{
    public abstract int StatusCode { get; }
    protected DomainException(string message) : base(message) { }
}

public sealed class ValidationException : DomainException
{
    public override int StatusCode => 400;
    public ValidationException(string message) : base(message) { }
}

public sealed class NotFoundException : DomainException
{
    public override int StatusCode => 404;
    public NotFoundException(string message) : base(message) { }
}

public sealed class QuotaExceededException : DomainException
{
    public override int StatusCode => 429;
    public QuotaExceededException(string message) : base(message) { }
}

public sealed class ForbiddenException : DomainException
{
    public override int StatusCode => 403;
    public ForbiddenException(string message) : base(message) { }
}
