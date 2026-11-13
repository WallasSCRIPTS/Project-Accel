using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using ProjectAccel.Core;

namespace ProjectAccel.App;

/// <summary>
/// Janela principal do ProjectAccel: sem chrome do Windows
/// (FormBorderStyle.None), cantos arredondados de 20px desenhados pela própria
/// região da janela, área de resize própria na borda, e os botões de
/// minimizar/maximizar/fechar do app (via bridge) no lugar dos nativos.
/// A UI (React no WebView2) é servida de wwwroot via virtual host.
/// </summary>
public sealed class MainForm : Form
{
    private const int CornerRadius = 20;
    private const int ResizeBorder = 7;

    private const int WM_NCHITTEST = 0x0084;
    private const int WM_SIZE = 0x0005;
    private const int WM_NCLBUTTONDOWN = 0x00A1;
    private const int HTCLIENT = 1;
    private const int HTLEFT = 10, HTRIGHT = 11, HTTOP = 12;
    private const int HTTOPLEFT = 13, HTTOPRIGHT = 14, HTBOTTOM = 15, HTBOTTOMLEFT = 16, HTBOTTOMRIGHT = 17;
    private const int HTCAPTION = 2;
    private const int SIZE_MAXIMIZED = 2, SIZE_RESTORED = 0;

    [DllImport("user32.dll")] private static extern bool ReleaseCapture();
    [DllImport("user32.dll")] private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);

    private readonly WebView2 _webview = new() { Dock = DockStyle.Fill };
    private FormWindowState _lastState = FormWindowState.Normal;

    public MainForm()
    {
        Text = ProductInfo.Name;
        try
        {
            Icon = new Icon(Path.Combine(AppContext.BaseDirectory, "Assets", "projectaccel.ico"));
        }
        catch (Exception) { }

        FormBorderStyle = FormBorderStyle.None;          // sem caption/bordas nativas
        DoubleBuffered = true;
        ClientSize = new Size(1180, 720);
        MinimumSize = new Size(1000, 640);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(0x0D, 0x12, 0x19);    // canto externo da região

        Controls.Add(_webview);
        // dev: PROJECTACCEL_MAXIMIZED=1 abre a janela já maximizada (útil para screenshots)
        if (Environment.GetEnvironmentVariable("PROJECTACCEL_MAXIMIZED") == "1")
        {
            WindowState = FormWindowState.Maximized;
        }
        Load += async (_, _) =>
        {
            ApplyRoundedRegion();
            await InitWebViewAsync();
        };
    }

    // ───────────────────────── cantos arredondados (região) ─────────────────────────

    private void ApplyRoundedRegion()
    {
        var old = Region;
        if (WindowState == FormWindowState.Maximized)
        {
            Region = null; // tela cheia: quadrada
        }
        else
        {
            int d = CornerRadius * 2;
            using var path = new GraphicsPath();
            path.AddArc(0, 0, d, d, 180, 90);
            path.AddArc(Width - d, 0, d, d, 270, 90);
            path.AddArc(Width - d, Height - d, d, d, 0, 90);
            path.AddArc(0, Height - d, d, d, 90, 90);
            path.CloseFigure();
            Region = new Region(path);
        }
        old?.Dispose();
    }

    protected override void WndProc(ref Message m)
    {
        if (m.Msg == WM_SIZE)
        {
            base.WndProc(ref m);
            ApplyRoundedRegion();
            if (_lastState != WindowState)
            {
                _lastState = WindowState;
                _ = PostStateAsync();
            }
            return;
        }

        if (m.Msg == WM_NCHITTEST && WindowState != FormWindowState.Maximized)
        {
            base.WndProc(ref m);
            if (m.Result == (IntPtr)HTCLIENT)
            {
                var p = PointToClient(Cursor.Position);
                int w = ClientSize.Width, h = ClientSize.Height;
                bool left = p.X <= ResizeBorder, right = p.X >= w - ResizeBorder;
                bool top = p.Y <= ResizeBorder, bottom = p.Y >= h - ResizeBorder;

                if (top && left) m.Result = (IntPtr)HTTOPLEFT;
                else if (top && right) m.Result = (IntPtr)HTTOPRIGHT;
                else if (bottom && left) m.Result = (IntPtr)HTBOTTOMLEFT;
                else if (bottom && right) m.Result = (IntPtr)HTBOTTOMRIGHT;
                else if (left) m.Result = (IntPtr)HTLEFT;
                else if (right) m.Result = (IntPtr)HTRIGHT;
                else if (top) m.Result = (IntPtr)HTTOP;
                else if (bottom) m.Result = (IntPtr)HTBOTTOM;
            }
            return;
        }

        base.WndProc(ref m);
    }

    // ───────────────────────── WebView2 ─────────────────────────

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

                case "windowGetState":
                    Reply(id, ok: true, payload: new { maximized = WindowState == FormWindowState.Maximized });
                    break;

                case "windowMinimize":
                    WindowState = FormWindowState.Minimized;
                    Reply(id, ok: true);
                    break;

                case "windowToggleMaximize":
                    WindowState = WindowState == FormWindowState.Maximized
                        ? FormWindowState.Normal
                        : FormWindowState.Maximized; // WM_SIZE cuida da região e do push
                    Reply(id, ok: true, payload: new { maximized = WindowState == FormWindowState.Maximized });
                    break;

                case "windowClose":
                    Reply(id, ok: true);
                    Close();
                    break;

                case "windowDrag":
                    // padrão clássico: finge caption-drag para o Windows assumir o movimento
                    ReleaseCapture();
                    SendMessage(Handle, WM_NCLBUTTONDOWN, (IntPtr)HTCAPTION, IntPtr.Zero);
                    Reply(id, ok: true);
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
        catch (Exception) { }
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
                maximized = WindowState == FormWindowState.Maximized,
            },
            error = (string?)null,
        });
        try
        {
            await Task.Delay(50); // deixa a página montar antes de receber o push
            _webview.CoreWebView2?.PostWebMessageAsJson(json);
        }
        catch (Exception) { }
    }
}
