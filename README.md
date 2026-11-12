# ProjectAccel

**Mouse acceleration, reimagined.**

App desktop moderno para aceleração de mouse no nível do driver — visual dark-first,
curvas ao vivo, perfis por jogo e migração a partir do `settings.json` do RawAccel.

![ProjectAccel](assets/logo/projectaccel-badge.svg)

> 🚧 **Status: planejamento / Fase 0.** Este repositório está sendo estruturado.
> Veja [`docs/PLAN.md`](docs/PLAN.md) para visão, arquitetura, roadmap e identidade visual.

## Visão geral

| | |
|---|---|
| **UI** | Avalonia UI 11 + .NET 8 |
| **Driver** | KMDF (kernel-mode, upper filter no mouse class), em desenvolvimento |
| **Backend** | Camada `IAccelBackend`: simulador no app ↔ driver ProjectAccel (`\\.\projectaccel`) |
| **Licença** | MIT |

## Estrutura

```
src/       projetos .NET (App, Core, Backend)
driver/    driver KMDF (projeto WDK separado)
assets/    identidade visual (logo SVG)
docs/      plano de produto e arquitetura
tests/     vetores e testes de curvas
```

## Referência

O clone de referência do [RawAccel](https://github.com/RawAccelOfficial/rawaccel) vive em
`rawaccel-reference/` (gitignored — consulta local apenas, licença MIT © 2020 a1xd).

## Créditos

O ProjectAccel é um sucessor espiritual independente do RawAccel (simon, _m00se_ e
comunidade). Sem afiliação com o projeto oficial.
