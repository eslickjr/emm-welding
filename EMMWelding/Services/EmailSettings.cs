namespace EMMWelding.Services;

/// <summary>
/// Matches the "Email" section in appsettings.json.
/// Put the real password in user-secrets (development) or environment variables (production),
/// never in appsettings.json.
/// </summary>
public class EmailSettings
{
    /// <summary>Leave empty while practicing: emails are saved as .eml files instead of sent.</summary>
    public string? SmtpHost { get; set; }
    public int SmtpPort { get; set; } = 587;
    public bool UseStartTls { get; set; } = true;
    public string? Username { get; set; }
    public string? Password { get; set; }

    /// <summary>The address the website sends from (usually your SMTP account).</summary>
    public string FromAddress { get; set; } = "";
    public string FromName { get; set; } = "EMM Welding Website";

    /// <summary>The business owner's inbox that receives quote requests.</summary>
    public string ToAddress { get; set; } = "";

    /// <summary>Folder (relative to the project) where emails are saved when SmtpHost is empty.</summary>
    public string DevOutboxFolder { get; set; } = "outbox";
}
