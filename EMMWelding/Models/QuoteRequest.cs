using System.ComponentModel.DataAnnotations;

namespace EMMWelding.Models;

/// <summary>
/// Everything a customer fills in on the Request a Quote page.
/// The [Required] / [StringLength] attributes drive the form's validation messages.
/// </summary>
public class QuoteRequest
{
    [Required(ErrorMessage = "Please enter your name.")]
    [StringLength(100)]
    public string Name { get; set; } = "";

    [Required(ErrorMessage = "Please enter your email so we can reply.")]
    [EmailAddress(ErrorMessage = "That doesn't look like a valid email address.")]
    [StringLength(200)]
    public string Email { get; set; } = "";

    [StringLength(30)]
    public string? Phone { get; set; }

    [Required(ErrorMessage = "Please choose the type of work.")]
    public string ServiceType { get; set; } = "";

    [StringLength(200)]
    public string? JobLocation { get; set; }

    [Required(ErrorMessage = "Please describe the job.")]
    [StringLength(4000, MinimumLength = 10, ErrorMessage = "Please give us a little more detail (at least 10 characters).")]
    public string Description { get; set; } = "";

    /// <summary>Photos the customer attached. Filled in by the Quote page, not by data binding.</summary>
    public List<QuoteAttachment> Photos { get; } = new();
}

/// <summary>An uploaded photo, held in memory until the email is sent.</summary>
public record QuoteAttachment(string FileName, string ContentType, byte[] Data);
