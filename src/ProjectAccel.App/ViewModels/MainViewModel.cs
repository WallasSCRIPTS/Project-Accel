using ProjectAccel.Core;
using CommunityToolkit.Mvvm.ComponentModel;

namespace ProjectAccel.App.ViewModels;

public partial class MainViewModel : ViewModelBase
{
    public string ProductName => ProductInfo.Name;
    public string Tagline => ProductInfo.Tagline;
    public string VersionChip => $"v{ProductInfo.Version}";
    public string BackendStatus => "Backend: Simulado";
    public string DriverStatus => "Driver: não detectado";
    public string FooterNote => "Fase 0 · Scaffold · .NET 8 · Avalonia 12 · MIT";
}
