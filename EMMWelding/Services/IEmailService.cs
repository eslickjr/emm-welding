using EMMWelding.Models;

namespace EMMWelding.Services;

/// <summary>
/// Pages depend on this interface rather than the concrete class,
/// so you can swap in a different sender (SendGrid, Azure, a fake for tests) later.
/// </summary>
public interface IEmailService
{
    Task SendQuoteRequestAsync(QuoteRequest request, CancellationToken cancellationToken = default);
}
