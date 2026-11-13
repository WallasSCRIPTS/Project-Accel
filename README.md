# ProjectAccel

**Mouse acceleration, reimagined.**

App desktop moderno para aceleração de mouse no nível do driver — visual dark-first,
curvas ao vivo, perfis por jogo e migração a partir do `settings.json` do RawAccel.

![ProjectAccel](assets/logo/projectaccel-badge.svg)

![Screenshot — Fase 0](docs/screenshot.png)

> 🚧 **Status: Fase 0 concluída (scaffold).** A base está pronta: solução, tema dark,
> marca, build limpo (0 erros) e janela inicial. Próxima etapa: **Fase 1** (editor de
> curvas + backend simulado). Veja [`docs/PLAN.md`](docs/PLAN.md) para a visão completa.

## Visão geral

| | |
|---|---|
| **UI** | Avalonia UI 12 + .NET 8 (LTS) |
| **Driver** | KMDF (kernel-mode, upper filter no mouse class), em desenvolvimento |
| **Backend** | Camada `IAccelBackend`: simulador no app ↔ driver ProjectAccel (`\\.\projectaccel`) |
| **Licença** | MIT |

## Build & run

Pré-requisitos: **.NET SDK 9 ou 10** para *buildar* (os source generators do Avalonia 12
exigem Roslyn ≥ 4.14). O app roda em cima do runtime .NET 8.

```powershell
dotnet build
dotnet test
dotnet run --project src/ProjectAccel.App
```

> ⚠️ Windows SmartScreen/anti-cheat: nenhum driver de terceiros carrega em produção sem
> assinatura. O driver próprio chega assinado na Fase 3 — até lá, o app opera em modo
> simulado (preview de curvas, sem aplicar nada ao mouse). Detalhes em docs/PLAN.md.

## Estrutura

```
src/       projetos .NET (App, Core, Backend)
driver/    driver KMDF (projeto WDK separado, ainda não criado)
assets/    identidade visual (logo SVG)
docs/      plano de produto e arquitetura + screenshot
tests/     vetores e testes de curvas
```

## Referência

O clone de referência do [RawAccel](https://github.com/RawAccelOfficial/rawaccel) vive em
`rawaccel-reference/` (gitignored — consulta local apenas, licença MIT © 2020 a1xd).

## Créditos

O ProjectAccel é um sucessor espiritual independente do RawAccel (simon, _m00se_ e
comunidade). Sem afiliação com o projeto oficial.
