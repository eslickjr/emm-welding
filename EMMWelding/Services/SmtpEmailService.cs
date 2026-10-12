using System.Text;
using EMMWelding.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace EMMWelding.Services;

/// <summary>
/// Builds the quote email (with photo attachments) and sends it over SMTP.
/// If no SMTP host is configured, it saves the email to an "outbox" folder instead,
/// so you can test the whole form without any email account.
/// </summary>
public class SmtpEmailService(
    IOptions<EmailSettings> options,
    IWebHostEnvironment environment,
    ILogger<SmtpEmailService> logger) : IEmailService
{
    private readonly EmailSettings _settings = options.Value;

    public async Task SendQuoteRequestAsync(QuoteRequest request, CancellationToken cancellationToken = default)
    {
        var message = BuildMessage(request);

        if (string.IsNullOrWhiteSpace(_settings.SmtpHost))
        {
            await SaveToOutboxAsync(message, cancellationToken);
            return;
        }

        using var client = new SmtpClient();
        var security = _settings.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;

        await client.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, security, cancellationToken);

        if (!string.IsNullOrEmpty(_settings.Username))
        {
            await client.AuthenticateAsync(_settings.Username, _settings.Password, cancellationToken);
        }

        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);

        logger.LogInformation("Quote request from {Email} sent to {To}.", request.Email, _settings.ToAddress);
    }

    private MimeMessage BuildMessage(QuoteRequest request)
    {
        var fromAddress = string.IsNullOrWhiteSpace(_settings.FromAddress) ? "website@localhost" : _settings.FromAddress;
        var toAddress = string.IsNullOrWhiteSpace(_settings.ToAddress) ? "owner@localhost" : _settings.ToAddress;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.FromName, fromAddress));
        message.To.Add(MailboxAddress.Parse(toAddress));

        // Hitting "Reply" in the owner's inbox goes straight to the customer.
        message.ReplyTo.Add(new MailboxAddress(request.Name, request.Email));

        message.Subject = $"Quote request: {request.ServiceType} – {request.Name}";

        var body = new StringBuilder();
        body.AppendLine("New quote request from the website");
        body.AppendLine("----------------------------------");
        body.AppendLine($"Name:      {request.Name}");
        body.AppendLine($"Email:     {request.Email}");
        body.AppendLine($"Phone:     {(string.IsNullOrWhiteSpace(request.Phone) ? "(not given)" : request.Phone)}");
        body.AppendLine($"Service:   {request.ServiceType}");
        body.AppendLine($"Location:  {(string.IsNullOrWhiteSpace(request.JobLocation) ? "(not given)" : request.JobLocation)}");
        body.AppendLine($"Photos:    {request.Photos.Count}");
        body.AppendLine();
        body.AppendLine("Job description:");
        body.AppendLine(request.Description);

        // Plain text only: customer input is never rendered as HTML, so it can't inject markup.
        var builder = new BodyBuilder { TextBody = body.ToString() };

        foreach (var photo in request.Photos)
        {
            builder.Attachments.Add(photo.FileName, photo.Data, ContentType.Parse(photo.ContentType));
        }

        message.Body = builder.ToMessageBody();
        return message;
    }

    private async Task SaveToOutboxAsync(MimeMessage message, CancellationToken cancellationToken)
    {
        var folder = Path.Combine(environment.ContentRootPath, _settings.DevOutboxFolder);
        Directory.CreateDirectory(folder);

        var path = Path.Combine(folder, $"quote-{DateTime.Now:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.eml");
        await message.WriteToAsync(path, cancellationToken);

        logger.LogWarning(
            "Email:SmtpHost is not configured, so the quote email was saved to {Path} instead of sent. " +
            "Open the .eml file with Outlook or Thunderbird to see it.", path);
    }
}
