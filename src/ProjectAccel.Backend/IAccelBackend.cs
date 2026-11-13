using ProjectAccel.Core;

namespace ProjectAccel.Backend;

/// <summary>How the app talks to the acceleration layer.</summary>
public enum BackendKind
{
    /// <summary>Toda a matemática e previews acontecem no app; nada é aplicado no mouse. (Fase 1)</summary>
    Simulated,

    /// <summary>IOCTL para o driver próprio do ProjectAccel (\\.\projectaccel). (Fase 2+)</summary>
    ProjectAccel,
}

/// <summary>
/// Contrato inicial entre o app e a camada de aceleração. A Fase 1 implementa
/// <see cref="BackendKind.Simulated"/>; o driver próprio (Fase 2) implementa
/// <see cref="BackendKind.ProjectAccel"/>. Mantido pequeno de propósito — o
/// detalhe do protocolo IOCTL fica em ProjectAccel.Driver (namespace separado),
/// não nesta interface.
/// </summary>
public interface IAccelBackend
{
    BackendKind Kind { get; }

    /// <summary>Nome amigável para exibição (ex: "Simulado (preview, nada é aplicado)").</summary>
    string DisplayName { get; }

    /// <summary>Versão do backend/driver, ou null quando indisponível (simulado).</summary>
    string? GetVersion();

    /// <summary>Aplica as settings ao driver. No backend simulado, apenas valida e devolve o resultado.</summary>
    BackendResult Apply(string settingsJson);

    /// <summary>Lê as settings atualmente ativas, ou null se nada estiver aplicado.</summary>
    string? GetActive();
}

public readonly record struct BackendResult(bool Success, string? Error)
{
    public static BackendResult Ok() => new(true, null);
    public static BackendResult Fail(string error) => new(false, error);
}
