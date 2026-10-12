using EMMWelding.Components;
using EMMWelding.Services;

var builder = WebApplication.CreateBuilder(args);

// ---- Services (things the app can "inject" into components) ----

// Turns on Razor components and the Interactive Server render mode.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// Binds the "Email" section of appsettings.json (and user-secrets) to EmailSettings.
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("Email"));

// Registers our email sender so the Quote page can ask for an IEmailService.
builder.Services.AddScoped<IEmailService, SmtpEmailService>();

var app = builder.Build();

// ---- HTTP pipeline (what happens to each incoming request, in order) ----

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

// Shows our NotFound page for URLs that don't exist.
app.UseStatusCodePagesWithReExecute("/not-found");

app.UseHttpsRedirection();
app.UseAntiforgery();

app.UseStaticFiles();
app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
