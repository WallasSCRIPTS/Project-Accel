# ProjectAccel — Plano de Produto e Arquitetura

> Mouse acceleration, reimagined. · App desktop nativo, driver próprio em modo kernel,
> UI minimalista dark-first.

Status: **Fase 0 concluída** · Nome: **ProjectAccel**

---

## 1. Visão

Um acelerador de mouse em nível de kernel que respeita o usuário: curva de
sensibilização transparente, perfis por jogo, instalação silenciosa e uma interface
que dá prazer de usar. O vazio que estamos ocupando: os drivers existentes funcionam,
mas entregam UIs de outra década, sem onboarding e com arquivos de configuração
arcanos.

Pilares:

1. **Visual premium, minimalista** — vidro translúcido, glows de fundo discretos,
   tipografia grande e calma, motion curto e sem frescura.
2. **Praticidade** — perfis por jogo, duplicar/exportar/importar em JSON, preview de
   cada curva antes de aplicar, DPI por dispositivo.
3. **Transparência** — nada de telemetria escondida; o que o driver recebe é
   inspecionável (fórmula ativa, versão, estado).
4. **Postura anti-abuso** — delay de 1 segundo na aplicação e fórmulas congeladas
   por versão. Nada que um anti-cheat sério possa confundir com trapaça.

---

## 2. Driver próprio: o que é preciso

Um driver kernel x64 **não carrega no Windows 10/11 sem assinatura**. Isso define
a ordem do projeto:

- **Dev/teste**: test signing (`bcdedit /set testsigning on`) — funciona na máquina
  de desenvolvedor. **Não serve para usuário final** e anti-cheats não perdoam.
- **Distribuição**: assinatura *attestation* via Microsoft Hardware Dev Center —
  exige **certificado EV** (~US$ 300–700/ano), conta de parceiro Microsoft e revisão
  do driver (submissão e verificação). Prazo típico da 1ª submissão: semanas.
- **Anti-cheat**: nenhum driver novo chega com passe livre para Vanguard/EAC/BattlEye.
  Mitigação: semântica conservadora (fórmulas congeladas por versão, delay de 1 s,
  UpperFilter apenas no mouse class) e hashes publicados para verificação.

A arquitetura por fases existe para isolar esse risco: o app nasce **usável** na
Fase 1 (editor + backend simulado), e o driver só bloqueia a Fase 3.

| Fase | Backend | Entrega |
|---|---|---|
| 0 | — | Scaffold nativo + marca + build verde ✅ |
| 1 | `SimulatedBackend` | Editor completo de curvas + perfis + import/export |
| 2 | `ProjectAccelBackend` (test-signed) | Driver próprio aplicando no mouse (dev) |
| 3 | `ProjectAccelBackend` (attestation) | Release v1.0 assinado, instalador, winget |
| 4 | — | Comunidade: i18n, presets, roadmap público |

---

## 3. Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Shell nativo | **WinForms** (`net8.0-windows10.0.19041.0`) | Janela única, DWM dark caption, zero cerimônia, instalador simples |
| Chromium host | **WebView2** (Runtime Evergreen, presente no Win10/11) | Rodar a UI React sem servidor HTTP: `appassets.local` → `wwwroot/` |
| UI | **React 19 + TypeScript + Vite** (`web/`) | Componentes modernos; bundle ~78 KB gzip; HMR em dev |
| Design language | Vidro (fills translúcidos + blur), glows de fundo, motion `cubic-bezier(.22,1,.36,1)` | Visual de player premium, minimalista — implementado à mão (ver §6) |
| Ícones | **MingCute** (`@mingcute/react`) | Set open-source completo, Regular/Filled |
| Gráficos (Fase 1) | Canvas próprio ou lib leve (decisão da Fase 1) | Sem requisito de WebGL |
| Bridge | `chrome.webview.postMessage` ↔ `WebMessageReceived` | Mensagens JSON tipadas `{id, type}` → `{id, ok, payload|error}` |
| Documento de domínio | C# (`ProjectAccel.Core`), testes xUnit | Matemática única de curvas |
| Persistência | JSON em `%AppData%\ProjectAccel\` | Fora do CWD, escopo do usuário |
| Instalador (Fase 3) | Inno Setup + assinatura Authenticode | Padrão Windows, elevação para o driver |

Ambiente de desenvolvimento atual: VS 2026 Community, .NET SDK 10 (SDK 8 também vale),
Node 26/npm 11, WebView2 Runtime 157.

### O bridge em uma linha

`MainForm.OnWebMessageReceived` → `switch (type) { "ping" | "getProductInfo" | "openProjectDocs" }`
→ `Reply(id, ok, payload)` via `PostWebMessageAsJson`. O React nunca fala com o driver.

---

## 4. Estrutura da solução

```
Project Accel/
├── src/
│   ├── ProjectAccel.App/          # WinForms + WebView2 (host). Assets, MainForm, bridge
│   ├── ProjectAccel.Core/         # Domínio: curvas, perfis, dispositivos, EMA, validação
│   └── ProjectAccel.Backend/      # IAccelBackend, SimulatedBackend, ProjectAccelBackend (IOCTL)
├── web/                           # UI React (Vite)
│   ├── public/                    # estáticos (logo, badge, appicon)
│   └── src/                       # App.tsx, bridge.ts, index.css (design system)
├── driver/                        # (Fase 2) KMDF upper filter, INF de instalação
├── tests/ProjectAccel.Core.Tests/ # xUnit — vetores de curva
├── assets/logo/                   # marca: fonte .png (nó), variantes, squircle, .ico
├── docs/
└── packaging/                     # (Fase 3) winget manifest, scripts de assinatura
```

Build: `web/npm run build` → `web/dist/` → o `.csproj` copia para `wwwroot/` no
`bin/` do host (via `Content` + `%(RecursiveDir)`). Sem servidor HTTP, sem porta.

---

## 5. O que o app tem (escopo)

**Fase 1 (próxima):** editor de curvas (sensibilidade/velocidade/ganho × X/Y/combinado),
todos os modos conhecidos (Linear, Classic, Natural, Synchronous, Power, Jump, Lookup
Table, Off) com caps (in/out/io), offsets, anisotropia (domain/range weights, rotação,
angle snap, Lp-norm, whole/by-component), smoothing EMA, perfis nomeados por jogo,
exportar/importar JSON, DPI/polling por dispositivo.

**Fase 2:** driver KMDF próprio: UpperFilter no mouse class, IOCTLs `READ`/`WRITE`/
`GET_VERSION`, state por device (instance-id), DPI normalization, delay de 1 s na
aplicação, assinatura de teste.

**Fase 3:** attestation signing, instalador (driver + app) com elevação, checksums,
canal de updates, winget submission.

---

## 6. Identidade visual

**O NÓ** — marca isométrica intertravada (fonte `assets/logo/projectaccel-mark-black.png`,
500×500, fundo transparente, monocromática). Variantes geradas:

| Arquivo | Uso |
|---|---|
| `projectaccel-mark-white.png` | fundos escuros (app) |
| `projectaccel-mark-black.png` | fundos claros / impressão |
| `projectaccel-mark-ember.png` | destaque em material de marketing |
| `projectaccel-appicon(-256).png` | squircle escuro + nó branco — ícone do app |
| `projectaccel.ico` | ícone do executável/taskbar |
| `projectaccel-badge.png` | README / capitas (848×336) |
| `web/public/appicon.png` | hero da UI (cover 168px) |

**Linguagem de design (própria, não copiada):** janela dark `#0d1219` com glows
radiais quase invisíveis (âmbar 15% sup-dir, ciano 8% inf-esq); sidebar de vidro
(rgba 4–10% + blur); fills translúcidos `subtle/fill/hover/strong`; hairlines
`rgba(255,255,255,.08)`; radius 8/12/20; motion 140–380 ms com
`cubic-bezier(.22,1,.36,1)`; Inter como tipografia; acento único ember `#ff6a3a`;
séries de gráfico em âmbar/ciano. Ícones MingCute Regular (active: Filled/tinted).

**Orientação sobre componentes de terceiros:**
- `reactbits.dev` (free) e `transitions.dev` oferecem componentes/animações React;
  os tiers **Pro são pagos** (licença comercial separada). Hoje a UI usa apenas
  implementações próprias (Row, Chip, Button, Toast, Search) nessa mesma linguagem.
- Nenhum arquivo de terceiros foi copiado para o repositório.
- Quando o projeto tiver licença Pro (ou usarmos apenas os free), os componentes
  ReactBits entram via `web/src/components/`, auditáveis um a um.

---

## 7. Licenciamento

- Nosso código: **MIT**.
- Dependências npm: React (MIT), Vite (MIT), MingCute (open), Inter (OFL).
- Marca: o nó é a identidade do ProjectAccel; o arquivo-fonte mora em `assets/logo/`.
- Sem attribution de terceiros além dos listados no README (nenhum código de terceiros
  foi copiado).

---

## 8. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Assinatura do driver (custo/prazo) | Fases 1–2 úteis sem release; EV cert reservado na Fase 3 |
| Anti-cheat bloqueando driver novo | Semântica conservadora + hashes + 1 s de delay; protocolo de comunicação público |
| Escopo escorregando para "clone de player de música" | Este documento é a âncora: driver primeiro, UI sempre a serviço do driver |
| Retrabalho de UI | Design system congelado em `web/src/index.css` (§6); novos componentes entram como rows/chips/toasts |

---

## 9. Próximos passos imediatos

1. ✅ Fase 0 — scaffold (este commit)
2. **Fase 1** — `ProjectAccel.Core`: `CurveEvaluator` + `*.Tests` com vetores analíticos
   (Linear, Classic, Natural, Synchronous, Power, Jump, LUT) + editor React com canvas.
3. Branding final pós-decisão de marca (o nó já é definitivo salvo veto).
4. `driver/` — criar projeto WDK (UpperFilter) e driver de teste.
