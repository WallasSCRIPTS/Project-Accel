using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using Avalonia.Controls;

namespace ProjectAccel.App.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }

    private void OpenPlan_Click(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
        => OpenFromRepoRoot("docs", "PLAN.md");

    private void OpenReadme_Click(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
        => OpenFromRepoRoot("README.md");

    /// <summary>
    /// Docs vivem na raiz do repositório, não ao lado do binário. Sobe a árvore
    /// a partir do CWD (e do diretório do assembly) procurando o arquivo.
    /// </summary>
    private static void OpenFromRepoRoot(params string[] relativeParts)
    {
        try
        {
            foreach (var start in new[] { Environment.CurrentDirectory, AppContext.BaseDirectory })
            {
                var dir = new DirectoryInfo(start);
                for (var i = 0; i < 8 && dir is not null; i++)
                {
                    var candidate = Path.Combine(new[] { dir.FullName }.Concat(relativeParts).ToArray());
                    if (File.Exists(candidate))
                    {
                        Process.Start(new ProcessStartInfo(candidate) { UseShellExecute = true });
                        return;
                    }
                    dir = dir.Parent;
                }
            }
        }
        catch
        {
            // Abrir um documento é conveniência — nunca quebra o app.
        }
    }
}
