# EMM Welding – Blazor Web App (.NET 10)

A starter website for EMM Welding: Home, Services, About, and a **Request a Quote** form
that emails the owner, with customer photo uploads attached.

## Run it

1. Install the **.NET 10 SDK** (https://dotnet.microsoft.com/download), or Visual Studio 2026 / VS Code with the C# Dev Kit.
2. Open `EMMWelding.slnx` in Visual Studio and press **F5**, or from a terminal:
   ```
   cd EMMWelding
   dotnet run
   ```
3. Browse to http://localhost:5080.

You can submit the quote form right away. With no email server configured, each request is
saved as an `.eml` file in `EMMWelding/outbox/` — double-click one to open it in your mail app
and check the photos came through.

## How the project is laid out

```
EMMWelding/
├── Program.cs                 App startup: registers services, sets up the request pipeline
├── appsettings.json           Settings (email server, logging)
├── Components/
│   ├── App.razor              The <html> shell every page renders inside
│   ├── Routes.razor           Maps URLs to pages
│   ├── _Imports.razor         @using lines shared by all .razor files
│   ├── Layout/
│   │   ├── MainLayout.razor   Header + footer wrapped around every page
│   │   ├── MainLayout.razor.css  Styles scoped to MainLayout only (CSS isolation)
│   │   └── NavMenu.razor      Top navigation
│   └── Pages/                 One file per page; `@page "/url"` at the top sets its address
│       ├── Home.razor  Services.razor  About.razor
│       ├── Quote.razor        The interactive quote form
│       └── NotFound.razor  Error.razor
├── Models/QuoteRequest.cs     The form's data + validation rules
├── Services/                  Email sending (kept out of the page so it's reusable/testable)
└── wwwroot/app.css            Global styles and brand colors
```

## Key Blazor ideas used here

- **A `.razor` file is a component**: HTML markup plus a `@code { }` block of C#.
- **Render modes**: Home/Services/About have no `@rendermode`, so they're *static server rendering* —
  plain fast HTML. `Quote.razor` uses `@rendermode InteractiveServer`, so its C# runs on the server
  and updates the page live (file uploads, "Sending…" button, validation as you type).
  That's also why the SMTP password is safe: it never leaves the server.
- **`EditForm` + `DataAnnotationsValidator`** read the `[Required]`, `[EmailAddress]`, etc.
  attributes on `QuoteRequest` and show `ValidationMessage`s automatically.
- **Dependency injection**: `Program.cs` registers `IEmailService`; the page asks for it with `@inject`.

## Sending real email

Keep the password out of `appsettings.json` (and out of git). In development, use user-secrets
from the `EMMWelding/` folder:

```
dotnet user-secrets set "Email:SmtpHost" "smtp.gmail.com"
dotnet user-secrets set "Email:SmtpPort" "587"
dotnet user-secrets set "Email:Username" "you@gmail.com"
dotnet user-secrets set "Email:Password" "your-app-password"
dotnet user-secrets set "Email:FromAddress" "you@gmail.com"
dotnet user-secrets set "Email:ToAddress" "owner@emmwelding.com"
```

For Gmail you need 2-Step Verification on and an **App Password** (not your normal password).
Microsoft 365 uses `smtp.office365.com`. In production, set the same values as environment
variables, e.g. `Email__Password` (double underscore), or in your host's configuration panel.

## Limits on the quote form

Up to 5 photos, 10 MB each, 20 MB total (most email providers reject anything over ~25 MB).
Change the constants at the bottom of `Quote.razor`.

## Ideas for next steps

- Replace the `TODO` text with the client's real content and add photos to `wwwroot/images/`.
- Add rate limiting or a CAPTCHA to the quote form before going live to cut down spam.
- Save quote requests to a database as well as emailing them, so nothing is lost if email fails.
