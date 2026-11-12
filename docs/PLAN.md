# ProjectAccel — Plano de Produto e Arquitetura

> Mouse acceleration, reimagined. · App desktop moderno (Avalonia + .NET 8), driver próprio (KMDF), 100% independente.

Status: **fase de planejamento** · Nome: **ProjectAccel** · Pasta: `Project Accel`

---

## 1. Visão

Um sucessor espiritual do RawAccel com identidade própria: mais bonito, mais prático,
mais seguro. O RawAccel provou o conceito (driver kernel-mode que acelera o cursor no
raw input stream) mas a GUI dele é WinForms de 2019, com settings em `settings.json`
no CWD e zero onboarding. O ProjectAccel entrega:

1. **Visual moderno e escuro por padrão** (Avalonia, Fluent, tema próprio) com gráficos
   suaves e responsivos das curvas.
2. **Praticidade**: perfis nomeados por jogo, exportar/importar, presets de fábricas
   conhecidas (Quake clásico, EPP, synchronous…), detecção de mudanças de DPI,
   aplicação com 1 clique.
3. **Transparência**: mostra o que o driver recebe (fórmula ativa, versão, estado),
   logs locais, nada de telemetria escondida.
4. **Segurança anti-abuso**: mantém o delay de 1 segundo na aplicação e a regra de
   "fórmulas congeladas por versão" — postura anti-cheat do RawAccel, preservada.

### Honestidade sobre "100% independente"

Um driver kernel x64 **não carrega no Windows 10/11 sem assinatura**. Caminho real:

- **Dev/teste**: test signing (`bcdedit /set testsigning on`) — funciona na máquina de
  dev, **não serve para usuários finais** e é rejeitado por anti-cheats.
- **Distribuição**: assinatura de *attestation* via Microsoft Hardware Dev Center, que
  exige **certificado EV** (~US$ 300–700/ano) + conta de parceiro Microsoft + revisão
  do driver (submissão, verificação). Prazo típico da 1ª submissão: semanas.
- **Anti-cheat**: nenhum driver novo chega com passe livre para Vanguard/EAC/BattlEye.
  Mitigação: manter semântica conservadora (fórmulas congeladas, delay de 1s, nada de
  hooking além do mouse class UpperFilters) e publicar hashes/assinatura para
  verificação. Risco residual existe e deve estar claro para o usuário.

**Decisão de arquitetura que viabiliza isso:** o app fala com o driver por uma
**camada de abstração (`IAccelBackend`)**. Backends:

| Backend | Uso | Quando |
|---|---|---|
| `SimulatedBackend` | Matemática de curvas 100% no app (cálculo + gráficos), sem driver | Fase 0–1, desenvolvimento, modo "editor/simulador" |
| `RawAccelBackend` *(dev only, opcional)* | Fala o protocolo IOCTL do RawAccel (`\\.\rawaccel`) | Validação de UX com driver real antes do nosso existir |
| `ProjectAccelBackend` | IOCTL do **nosso** driver (`\\.\projectaccel`) | Fase 2+, produto final independente |

O app nunca depende do RawAccel em produção: a independência é o destino; a abstração
é só o andaime que nos deixa construir o produto antes do driver estar assinado.

---

## 2. Stack

| Camada | Tecnologia | Motivo |
|---|---|---|
| UI | **Avalonia UI 11** (.NET 8 LTS) | XAML moderno, dark-first, renderiza curvas via GPU, mesmo stack que a UI 2.0 oficial adotou |
| Gráficos de curva | **ScottPlot 5** (MIT) | Gráficos rápidos, tooltips, pan/zoom, sem dependência pesada |
| Matemática de curvas | C# próprio em `ProjectAccel.Core` | Portabilidade app ↔ testes; driver tem a própria irmã em C++ |
| Driver | C++17 + WDK (KMDF), UpperFilter no mouse class | Modelo provável, sem hacks |
| Bridge app↔driver | P/Invoke (`DeviceIoControl`) direto de `ProjectAccel.Backend` | Sem C++/CLI (o RawAccel carrega esse legado; nós não precisamos) |
| Persistência | JSON em `%AppData%\ProjectAccel\` | Perfis, devices, preferências — fora do CWD |
| Instalador | Inno Setup 6 + assinatura Authenticode | Padrão Windows; instala driver + app com elevação |
| Testes | xUnit (Core/Backend) + driver verification (WDK) | Curvas validadas contra vetores analíticos |

Ambiente atual: **VS 2026 Community + MSBuild** instalado; **.NET SDK 8 ausente**
(runtimes 8/10 presentes) → instalar com `winget install Microsoft.DotNet.SDK.8` na Fase 0.

---

## 3. Estrutura da solução

```
Project Accel/
├── ProjectAccel.sln
├── src/
│   ├── ProjectAccel.Core/          # Domínio: curvas, perfis, devices, EMA, validação (sem deps de UI)
│   ├── ProjectAccel.Backend/       # IAccelBackend, SimulatedBackend, ProjectAccelBackend (IOCTL), (RawAccelBackend dev-only)
│   ├── ProjectAccel.App/           # Avalonia: Views, ViewModels, navegação, temas, assets
│   │   ├── Assets/                 # ícones, logo, fontes
│   │   └── Themes/                 # paleta ProjectAccel (Graphite/Ember/Cyan)
│   └── ProjectAccel.Installer/     # Inno Setup scripts
├── driver/                         # Driver KMDF (projeto WDK separado, não na .sln principal)
│   ├── src/                        # filter driver: IOCTL READ/WRITE/GET_VERSION, state por device
│   └── inf/                        # INF de instalação
├── tests/
│   ├── ProjectAccel.Core.Tests/
│   └── vectors/                    # vetores de curva analíticos compartilhados app↔driver
├── assets/logo/                    # identidade visual (SVG fonte da verdade)
├── docs/
├── packaging/                      # assinatura, winget manifest, release notes
└── rawaccel-reference/             # clone de referência (gitignored, NUNCA commitar)
```

### Fluxo de dados (runtime)

```
App (Avalonia) ──IOCTL──▶ \\.\projectaccel ──▶ driver: valida buffer → delay 1s → troca estado (paged pool)
     ▲                                                            │
     └── READ (estado ativo) / GET_VERSION ◀──────────────────────┘
settings: %AppData%\ProjectAccel\settings.json + profiles\*.json
```

---

## 4. O que o app tem (escopo funcional)

**MVP (Fase 1 — Simulador completo, sem driver):**
- Dashboard: perfil ativo, DPI/polling do mouse, estado do "driver" (simulado), quick actions
- Editor de curvas: sensibilidade/velocidade/ganho × eixo (X/Y/combinado), com pontos ao vivo
- Todos os accel modes: **Linear, Classic, Natural, Synchronous, Power, Jump, Lookup Table, Off**
  (mesma família matemática do RawAccel — é a literatura conhecida — reimplementada)
- Anisotropia: domain/range weights, rotação, angle snapping, Lp-norm, "Whole vs by Component"
- Offsets (gain/legacy), Caps (in/out/io), smoothing EMA (input/scale/output)
- Perfis por jogo: duplicar, renomear, exportar/importar, presets
- Tema dark/ember/cyan + tema claro
- Importar `settings.json` do RawAccel (migração de usuários — grande diferencial)
- Editor LUT gráfico (arrastar pontos) — algo que o RawAccel só aceita por texto

**Fase 2 — Driver próprio:** KMDF upper filter, IOCTLs próprios, state por device
(instance-id), DPI normalization, rate limit de aplicação (1s), assinatura de teste.

**Fase 3 — Release:** cert EV, attestation signing, instalador assinado, landing/README,
checksums, canal de updates, winget.

---

## 5. Identidade visual

- **Nome**: ProjectAccel (pasta homônima; busca sem colisão no nicho — os resultados de
  "Project Accelerator" são do Microsoft Project PPM, não conflitam).
- **Tagline**: *Mouse acceleration, reimagined.*
- **Conceito da marca**: "The Kick" — a curva de velocidade fazendo "hockey stick",
  do nó ciano (input do mouse) até a faísca âmbar (cursor no alvo).
- **Paleta**:
  | Papel | Hex |
  |---|---|
  | Graphite 900 (fundo app) | `#10161F` |
  | Graphite 800 (painel) | `#161E28` |
  | Texto | `#E8EDF4` · secundário `#8E99AB` |
  | Ember (gradiente da curva) | `#FFB03A → #FF6A3A → #FF3D2E` |
  | Cyan (nó de input / acento) | `#35E0FF` |
- **Assets** (`assets/logo/`): `projectaccel-mark.svg` (ícone), `-mono` (glyph neutra),
  `lockup-dark`, `lockup-light`, `badge` (para README/marketings).
- Tipografia sugerida: **Space Grotesk** (display) + **Inter** (texto) — livre do Google
  Fonts; empacotar como recurso do app.

Observações: nome "Project" soa como codinome; no release público dá pra manter
(ProjectAccel) ou encurtar para **Accel** — decisão de marca fica para depois do MVP.
Sempre usar "ProjectAccel" como uma palavra no código/binário (`ProjectAccel.exe`).

---

## 6. Roadmap

| Fase | Entrega | Critério de pronto |
|---|---|---|
| **0** | Scaffold: solução, temas, logo, CI básico (build+test) | `dotnet build` verde; app abre em janela escura com o logo |
| **1** | App simulador completo (editor de curvas, perfis, import RawAccel) | Usuário consegue montar e *sentir a diferença* nas curvas (preview), ainda sem aplicar no driver |
| **2** | Driver ProjectAccel (test-signed) + `ProjectAccelBackend` | Aplicar settings reais no mouse na máquina de dev |
| **3** | Release v1.0: EV cert, assinatura, instalador, docs, winget | Instalação limpa num Windows 10/11 vanilla, anti-cheat compat com a postura do RawAccel |
| **4** | Comunidade/iteração: i18n PT/EN, presets por jogo, feedback | Roadmap público |

Riscos: assinatura (custo/prazo) ⇢ mitigar com SimulatedBackend usável desde a Fase 1;
anti-cheat ⇢ semântica conservadora + 1s de delay + hashes publicados; manutenção do
driver ⇢ fases curtas e driver verification no CI.

---

## 7. Licenciamento

- Nosso código: **MIT** (compatível com o ecossistema; RawAccel também é MIT).
- **Não copiar** arquivos do RawAccel verbatim para o driver sem necessidade; se algum
  vetor matemático for derivado, manter attribution no `NOTICE`/`LICENSE` (o original é
  © 2020 a1xd, MIT — permitido, desde que mantenha a nota).
- O clone de referência (`rawaccel-reference/`) fica **gitignored** — consulta local apenas.

## 8. Próximos passos imediatos

1. Aprovar este plano (e a identidade).
2. Instalar .NET SDK 8 via winget; criar solution + projetos.
3. Fase 0 → Fase 1: shell do app + editor de curvas (SimulatedBackend).
