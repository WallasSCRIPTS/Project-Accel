using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using ProjectAccel.Core;

namespace ProjectAccel.App;

/// <summary>
/// Janela principal: um WebView2 preenchendo a área útil, servindo o build do
/// React (pasta wwwroot, mapeada via protocolo virtual — sem servidor HTTP) e
/// respondendo às mensagens do bridge <c>chrome.webview.postMessage</c>.
/// O driver nunca é acessado pelo React diretamente; tudo passa por aqui.
/// </summary>
public sealed class MainForm : Form
{
    private readonly WebView2 _webview = new() { Dock = DockStyle.Fill };

    // Caption bar dark nos Windows 10 1809+/11 (DWMWA_USE_IMMERSIVE_DARK_MODE)
    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        int useDark = 1;
        DwmSetWindowAttribute(Handle, 20, ref useDark, sizeof(int));
    }

    public MainForm()
    {
        Text = ProductInfo.Name;
        try
        {
            Icon = new Icon(Path.Combine(AppContext.BaseDirectory, "Assets", "projectaccel.ico"));
        }
        catch (Exception)
        {
            // ícone é cosmético — não impede a janela de abrir
        }

        ClientSize = new Size(1180, 720);
        MinimumSize = new Size(1000, 640);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(0x10, 0x16, 0x1F);

        Controls.Add(_webview);
        Load += async (_, _) => await InitWebViewAsync();
    }

    private async Task InitWebViewAsync()
    {
        var wwwroot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
        if (!File.Exists(Path.Combine(wwwroot, "index.html")))
        {
            ShowMissingWebUi(wwwroot);
            return;
        }

        try
        {
            // Pasta de dados por-usuário (Program Files pode ser somente-leitura)
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                ProductInfo.Name, "WebView2");

            var env = await CoreWebView2Environment.CreateAsync(userDataFolder: userData);
            await _webview.EnsureCoreWebView2Async(env);
            var core = _webview.CoreWebView2;

            core.SetVirtualHostNameToFolderMapping(
                "appassets.local", wwwroot, CoreWebView2HostResourceAccessKind.Allow);

            core.WebMessageReceived += OnWebMessageReceived;
            core.NavigationCompleted += (_, _) => _ = PostStateAsync();

            // UI enxuta: sem menu de contexto e sem devtools fora do Debug
            core.Settings.AreDefaultContextMenusEnabled = false;
#if !DEBUG
            core.Settings.AreDevToolsEnabled = false;
#endif
            core.Navigate("https://appassets.local/index.html");
        }
        catch (Exception ex)
        {
            ShowMissingWebUi(wwwroot, ex.Message);
        }
    }

    private void ShowMissingWebUi(string wwwroot, string? detail = null)
    {
        Controls.Clear();
        var label = new Label
        {
            Dock = DockStyle.Fill,
            ForeColor = Color.FromArgb(0xE8, 0xED, 0xF4),
            BackColor = BackColor,
            Font = new Font("Segoe UI", 10.5f),
            TextAlign = ContentAlignment.MiddleCenter,
            Padding = new Padding(48),
            Text = "ProjectAccel\n\nA interface não está compilada em:\n" + wwwroot +
                   "\n\nRode:  cd web  &&  npm ci  &&  npm run build\n" +
                   (detail is null ? string.Empty : "\nDetalhe: " + detail),
        };
        Controls.Add(label);
    }

    // ───────────────────────── bridge (host ↔ web) ─────────────────────────

    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        int id = -1;
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            id = root.TryGetProperty("id", out var idEl) ? idEl.GetInt32() : -1;
            var type = root.TryGetProperty("type", out var t) ? t.GetString() : null;

            switch (type)
            {
                case "ping":
                    Reply(id, ok: true, payload: new { pong = true, utc = DateTimeOffset.UtcNow });
                    break;

                case "getProductInfo":
                    Reply(id, ok: true, payload: new
                    {
                        product = ProductInfo.Name,
                        tagline = ProductInfo.Tagline,
                        version = ProductInfo.Version,
                    });
                    break;

                case "openProjectDocs":
                    (bool ok, object? payload, string? error) = OpenProjectDocs();
                    Reply(id, ok, payload, error);
                    break;

                default:
                    Reply(id, ok: false, error: $"unknown message type: {type}");
                    break;
            }
        }
        catch (Exception ex)
        {
            Reply(id, ok: false, error: ex.Message);
        }
    }

    private (bool ok, object? payload, string? error) OpenProjectDocs()
    {
        try
        {
            // Docs vivem no repositório, não ao lado do binário — sobe a árvore a partir do CWD.
            foreach (var start in new[] { Environment.CurrentDirectory, AppContext.BaseDirectory })
            {
                var dir = new DirectoryInfo(start);
                for (var i = 0; i < 8 && dir is not null; i++)
                {
                    var candidate = Path.Combine(dir.FullName, "docs", "PLAN.md");
                    if (File.Exists(candidate))
                    {
                        Process.Start(new ProcessStartInfo(candidate) { UseShellExecute = true });
                        return (true, new { opened = candidate }, null);
                    }
                    dir = dir.Parent;
                }
            }
            return (false, null, "PLAN.md só existe no repositório (em produção isto é um no-op).");
        }
        catch (Exception ex)
        {
            return (false, null, ex.Message);
        }
    }

    private void Reply(int id, bool ok, object? payload = null, string? error = null)
    {
        var json = JsonSerializer.Serialize(new { id, ok, payload, error });
        try
        {
            _webview.CoreWebView2?.PostWebMessageAsJson(json);
        }
        catch (Exception)
        {
            // WebView2 pode estar morto — o bridge nunca derruba o host.
        }
    }

    private async Task PostStateAsync()
    {
        var json = JsonSerializer.Serialize(new
        {
            id = 0,
            ok = true,
            payload = new
            {
                product = ProductInfo.Name,
                version = ProductInfo.Version,
                backend = "Simulated",   // Fase 2 assume o ProjectAccelBackend
                driver = (string?)null,  // sem driver instalado ainda
            },
            error = (string?)null,
        });
        try
        {
            await Task.Delay(50); // deixa a página montar antes de receber o push
            _webview.CoreWebView2?.PostWebMessageAsJson(json);
        }
        catch (Exception)
        {
            // best-effort: a página também pode pedir tudo via ping/getProductInfo
        }
    }
}
