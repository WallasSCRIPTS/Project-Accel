namespace ProjectAccel.App;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();

        // Instância única — o ícone de bandeja chega numa fase futura.
        using var mutex = new Mutex(initiallyOwned: true, name: @"Local\ProjectAccel.SingleInstance", out var created);
        if (!created)
        {
            return;
        }

        Application.Run(new MainForm());
    }
}
