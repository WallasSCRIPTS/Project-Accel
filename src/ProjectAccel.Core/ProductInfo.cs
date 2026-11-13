namespace ProjectAccel.Core;

/// <summary>
/// Identity constants for the product. Kept dependency-free so both the app,
/// the tooling and the tests can reference them.
/// </summary>
public static class ProductInfo
{
    public const string Name = "ProjectAccel";
    public const string Tagline = "Mouse acceleration, reimagined.";
    public const string Version = "0.1.0-dev";
    public const string BackendDevicePath = @"\\.\projectaccel";
}
