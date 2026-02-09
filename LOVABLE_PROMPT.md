# Cronômetro — Play Emulator App
# Cole este arquivo inteiro como prompt no Lovable para gerar o site.

## Visão Geral

Crie uma aplicação web React + TypeScript chamada **"Cronômetro — Play Emulator"**.
É uma ferramenta para treinadores esportivos que transforma uma descrição em linguagem natural em uma **jogada estruturada completa**, com cartão de campo, plano de treino, validação tática e sugestões de melhoria. O fluxo inteiro acontece no frontend (sem backend obrigatório).

A interface deve ser moderna, limpa e responsiva (mobile-first). Use Tailwind CSS, shadcn/ui, Lucide icons e sonner para toasts.

---

## Páginas e Rotas

### 1. `/` — Home / Gerador de Jogadas (página principal)

A tela principal tem um **formulário simples** no topo:

- **Campo de texto grande** (textarea, placeholder: "Descreva sua jogada em linguagem natural..."). Exemplo: "QB takes snap from shotgun. WR1 runs a slant. RB flares to the flat. If LB drops, throw slant. If blitz, dump to RB."
- **Seletor de esporte** (dropdown): Football, Basketball, Soccer, Volleyball, Futsal. Default: auto-detectar do texto.
- **Botão "Gerar Jogada"** (destaque, cor primária)
- **Botão secundário "Usar Template"** que abre um modal com templates prontos (ver seção Templates)

Ao clicar "Gerar Jogada", o sistema processa o texto e exibe **abaixo do formulário** um painel com tabs:

**Tab 1 — Cartão de Campo** (default)
Card visual estilizado que mostra a jogada completa:
- Header: nome da jogada (extraído da 1ª frase), esporte, categoria (offense/defense/transition), versão, tags
- Seção **Roles**: lista de jogadores com posição e responsabilidade, em cards pequenos
- Seção **Passos de Execução**: lista numerada com ator, ação, timing (se houver)
- Seção **Leituras / Gatilhos (Triggers)**: condições e respostas
- Seção **Variações**: alternativas da jogada
- Seção **Fallbacks**: o que fazer se a jogada quebrar
- Seção **Coaching Points**: pontos-chave para o treinador

**Tab 2 — Plano de Treino**
- Duração estimada (ex: "~35 min")
- Fase Aquecimento (warmup): lista de atividades
- Fase Walkthrough: passos lidos da jogada
- Fase Full Speed: drills de variação e fallback
- Coaching Cues: dicas para o treinador durante a sessão

**Tab 3 — Análise do Motor Tático**
Mostra o resultado da validação simulada:
- **Nota geral** (0-100) com indicador visual (barra de progresso colorida: verde ≥75, amarelo ≥50, vermelho <50)
- **Avaliação resumida** (texto de 1-2 frases)
- **Reações prováveis do adversário**: lista com cenário, probabilidade (%) e descrição. Mostrar probabilidade como badge colorido.
- **Vulnerabilidades**: lista de pontos fracos detectados
- **Melhorias sugeridas**: cards com prioridade (high=vermelho, medium=amarelo, low=verde), área (steps/triggers/variations/fallbacks/roles), sugestão e razão

**Tab 4 — Exportar**
- Botão **"Baixar PDF"** que gera e baixa um PDF formatado com toda a informação
- Botão **"Copiar como texto"** que copia o cartão de campo em texto
- Botão **"Salvar na Biblioteca"** que salva a jogada no localStorage

**Ações rápidas** (botões acima das tabs):
- "Salvar" (ícone bookmark)
- "Duplicar" (ícone copy) — cria cópia editável
- "Nova versão" (ícone git-branch) — salva v2, v3...

---

### 2. `/library` — Biblioteca de Jogadas

Lista todas as jogadas salvas no localStorage.

- **Tabela/grid** com colunas: Nome, Esporte (com ícone), Categoria, Versão, Data
- **Busca** por nome/tag
- **Filtros** por esporte e categoria
- Clicar numa jogada abre ela na página principal para visualização/edição
- **Ações** por jogada: Abrir, Duplicar, Exportar PDF, Deletar
- **Histórico de versões**: ao clicar "versões", mostra v1, v2, v3... com diff visual

---

### 3. `/feedback` — Feedback e Métricas

**Seção 1 — Dar Feedback** (formulário):
- Seletor de jogada (dropdown das jogadas salvas)
- "Ficou claro?" — rating 1 a 5 estrelas
- "Rodou como esperado?" — rating 1 a 5 estrelas
- "O que você editou?" — campo de texto livre
- "Notas adicionais" — textarea
- Botão "Enviar Feedback"

**Seção 2 — Métricas de Aprendizagem** (dashboard com cards):
- **Jogadas geradas**: número total
- **Tempo médio do fluxo**: em ms (com indicador se ≤60s)
- **Taxa de export sem erro**: percentual
- **Taxa de reuso**: percentual
- **Taxa de falha do motor**: percentual
- **Taxa de sucesso do fallback**: percentual
- **Feedbacks recebidos**: número total

Cada métrica como um card com ícone, valor grande e label. Usar cores para indicar saúde (verde = bom, vermelho = precisa atenção).

---

### 4. `/templates` — Galeria de Templates

Grid de cards com os templates pré-definidos:

Cada card mostra:
- Nome do template
- Esporte (badge colorido)
- Categoria
- Preview do prompt (truncado)
- Botão "Usar este template" → preenche o formulário na Home e navega para `/`

---

## Layout Global

- **Sidebar** (desktop) ou **bottom nav** (mobile) com:
  - Home (ícone Zap)
  - Biblioteca (ícone BookOpen)
  - Feedback (ícone BarChart3)
  - Templates (ícone LayoutTemplate)
- **Header**: logo "Cronômetro" + badge "Play Emulator"
- **Dark mode toggle** (ícone Sun/Moon)

---

## Lógica de Negócio (implementar no frontend)

### Geração de Jogada (generatePlay)

Recebe o prompt e sport opcional. Retorna um objeto Play:

```typescript
interface Play {
  id: string;           // nanoid de 12 chars
  name: string;         // 1ª frase do prompt (max 60 chars)
  version: number;      // começa em 1
  sport: string;        // "football" | "basketball" | "soccer" | "volleyball" | "futsal"
  category: string;     // "offense" | "defense" | "transition" | "special teams" | "set piece"
  description: string;  // prompt original
  roles: Role[];
  steps: Step[];
  triggers: Trigger[];
  variations: Variation[];
  fallbacks: Fallback[];
  coachingPoints: string[];
  createdAt: string;    // ISO datetime
  updatedAt: string;
  tags: string[];       // auto-detectadas: "quick", "power", "misdirection", "screen", "zone", "man"
  sourcePrompt: string;
}

interface Role {
  id: string;
  name: string;
  position: string;
  responsibility: string;
}

interface Step {
  order: number;
  action: string;
  actor: string;       // role id
  detail?: string;
  timing?: string;
}

interface Trigger {
  name: string;
  condition: string;
  response: string;
}

interface Variation {
  name: string;
  description: string;
}

interface Fallback {
  trigger: string;
  action: string;
  detail?: string;
}
```

### Detecção de Esporte

Contar keywords no prompt (lowercase). O esporte com mais matches ganha. Default: football.

| Esporte    | Keywords                                                                                    |
|------------|---------------------------------------------------------------------------------------------|
| football   | quarterback, qb, receiver, wr, running back, rb, offensive line, linebacker, snap, handoff, pass, blitz, end zone, touchdown |
| basketball | point guard, pg, shooting guard, sg, center, forward, pick, screen, dribble, layup, three-pointer, court, hoop |
| soccer     | goalkeeper, gk, striker, midfielder, defender, winger, corner kick, free kick, offside, penalty, goal kick |
| volleyball | setter, libero, hitter, blocker, serve, spike, dig, rotation                                |
| futsal     | fixo, ala, pivô, goleiro, quadra                                                           |

### Detecção de Categoria

| Categoria     | Keywords                                                           |
|---------------|-------------------------------------------------------------------|
| offense       | attack, offense, offensive, scoring, ataque, ofensiv              |
| defense       | defense, defensive, defend, block, defesa, defensiv               |
| transition    | transition, counter, fast break, transição, contra-ataque         |
| special teams | special teams, kickoff, punt, field goal                          |
| set piece     | set piece, corner, free kick, jogada ensaiada, bola parada        |

Default: "offense"

### Roles Padrão por Esporte

**Football**: QB (Quarterback), WR1 (Wide Receiver 1), WR2 (Wide Receiver 2), RB (Running Back), OL (Offensive Line)

**Basketball**: PG (Point Guard), SG (Shooting Guard), SF (Small Forward), PF (Power Forward), C (Center)

**Soccer**: GK (Goalkeeper), CB (Center Back), MF (Midfielder), WG (Winger), ST (Striker)

**Volleyball**: S (Setter), OH (Outside Hitter), MB (Middle Blocker), OPP (Opposite), L (Libero)

**Futsal**: GK (Goleiro), FX (Fixo), AD (Ala Direita), AE (Ala Esquerda), PV (Pivô)

Se o prompt menciona ≥2 roles pelo nome/posição/id, usar só esses. Senão, usar todos os defaults do esporte.

### Extração de Steps

1. Dividir prompt por `.`, `!`, `?`, `\n`
2. Filtrar frases com >5 chars
3. Manter frases que contêm verbos de ação: pass, run, cut, screen, block, shoot, dribble, handoff, roll, fade, cross, move, set, pick, receive, throw, catch, sprint, flare, curl, passa, corre, corta, bloqueia, chuta, dribla, recebe, lança, arremessa
4. Detectar actor (qual role é mencionado na frase)
5. Numerar sequencialmente
6. Se <1 step encontrado, gerar 3 steps genéricos

### Extração de Triggers

Procurar frases que começam com ou contêm "if", "when", "se ", "quando". Default: { name: "Base read", condition: "Defense shows expected alignment", response: "Execute primary play as designed" }

### Extração de Variações

Procurar "variation", "option", "alternative", "variação", "opção", "alternativa". Default: { name: "Mirror", description: "Run the same play mirrored to the opposite side" }

### Extração de Fallbacks

Procurar "fallback", "bail out", "safety", "emergency", "abort", "escape", "segurança", "emergência". Default: { trigger: "Primary option covered / play breaks down", action: "Reset to safe position or take best available option", detail: "Communicate loudly, protect possession" }

### Coaching Points (sempre gerar)

1. "Key timing: execute steps in sequence (N steps total)"
2. Se >3 steps: "Rehearse steps 1-3 first before adding the full sequence"
3. "Communication is critical — call out reads and adjustments loudly"
4. "On breakdown, execute fallback immediately — don't freelance"

### Tags

Detectar por keywords: quick (quick/fast/rápid), power (power/strong/força), misdirection (fake/misdirection/trick/finta), screen (screen/pick/bloqueio), zone (zone/zona), man (man-to-man/individual/homem-a-homem)

### Motor Tático (simulado no frontend)

Gerar análise baseada na estrutura da jogada:

**Reações do adversário** (por categoria):
- Offense: "Zone coverage adjustment" (65%), "Blitz / high press" (35%)
- Defense: "Quick release / short passing" (55%)
- Se >4 steps: "Disruption at transition point" (50%)
- Se ≤1 variation: "Pattern recognition" (70%)

**Vulnerabilidades**:
- Se <2 fallbacks: "Limited fallback options"
- Se <2 triggers: "Insufficient read triggers"
- Se actors únicos < 50% dos roles: "Ball/action concentrated in few roles"
- Se >6 steps: "High step count increases execution complexity"

**Strength Score** (0-100):
```
base = 60
+ min(variations × 5, 15)
+ min(triggers × 5, 10)
+ min(fallbacks × 5, 10)
+ 5 se coachingPoints ≥ 3
- vulnerabilities × 8
- 5 se steps > 6
- 10 se roles < 3
clamp(0, 100)
```

**Melhorias** (derivadas do motor):
- Para reações com probabilidade ≥60%: sugerir variação para contrar (priority: high, area: variations)
- Para vulnerabilidades: sugerir ajuste (priority: high, area: steps)
- Se score <50: sugerir mais fallbacks (priority: medium, area: fallbacks)
- Se reações prováveis > triggers: sugerir mais triggers (priority: medium, area: triggers)

**Assessment text**:
- Score ≥75 e 0 high: "Strong play (X/100). No critical issues found."
- Score ≥50: "Decent play (X/100). X high-priority improvements recommended."
- Score <50: "Play needs work (X/100). X critical improvements needed."

### Plano de Treino

- **Warmup**: review roles, dynamic stretching, walk through formation at half speed
- **Walkthrough**: steps lidos da jogada (Step N: actor — action)
- **Full Speed**: full speed vs scout team + variation drills + fallback reps
- **Coaching Cues**: coaching points + triggers formatados
- **Duração**: 15 + (steps × 3) + (variations × 5) minutos

---

## Persistência (localStorage)

Usar localStorage para:
- `cronometro_plays`: array de Play objects (com versionamento por id + version)
- `cronometro_feedback`: array de FeedbackEntry objects
- `cronometro_metrics`: objeto LearningMetrics com médias acumuladas

```typescript
interface FeedbackEntry {
  playId: string;
  playVersion: number;
  timestamp: string;
  clarity: number;         // 1-5
  executionMatch: number;  // 1-5
  edits: Array<{ field: string; before: string; after: string }>;
  notes: string;
}

interface LearningMetrics {
  avgFlowTimeMs: number;
  exportSuccessRate: number;
  reuseRate: number;
  engineFailureRate: number;
  fallbackSuccessRate: number;
  totalPlaysGenerated: number;
  totalFeedbackEntries: number;
}
```

---

## Templates Pré-definidos

### 1. Quick Pass (Football)
- Esporte: Football | Categoria: Offense
- Prompt: "QB takes snap from shotgun. WR1 runs a 5-yard slant. WR2 runs a deep post to clear the safety. RB checks for blitz then flares to the flat as safety valve. QB reads the linebacker — if LB drops, throw the slant; if LB blitzes, dump to RB in the flat."

### 2. Pick and Roll (Basketball)
- Esporte: Basketball | Categoria: Offense
- Prompt: "PG brings ball up right side. PF sets a screen on PG's defender at the elbow. PG drives off the screen toward the basket. PF rolls to the rim. If PG's lane is open, attack the basket. If help comes, pass to PF on the roll. If both are covered, kick out to SG in the corner for a three-pointer."

### 3. Counter-Attack (Soccer)
- Esporte: Soccer | Categoria: Transition
- Prompt: "On turnover, CB plays long ball to striker. Winger sprints down the sideline for overlap. Midfielder pushes forward through the center as second option. Striker holds the ball and lays off to the winger or turns and shoots. If counter stalls, midfielder recycles possession and team reorganizes."

### 4. Quick Middle Attack (Volleyball)
- Esporte: Volleyball | Categoria: Offense
- Prompt: "Libero passes to setter in position 2. Setter fakes outside set and quick-sets to middle blocker running a 1-tempo attack in zone 3. Outside hitter approaches as decoy on the left antenna. If middle is blocked, setter dumps the ball over on second contact."

### 5. Rodízio com Pivô (Futsal)
- Esporte: Futsal | Categoria: Offense
- Prompt: "Fixo inicia jogada com passe para ala direita. Ala direita conduz e passa para o pivô. Pivô pivoteia e toca de volta para ala esquerda que chega de trás. Ala esquerda finaliza ou toca para fixo que subiu. Se a defesa fechar, pivô abre espaço com movimentação e bola volta para o fixo recomeçar."

---

## Estilo Visual

- Cores primárias: tons de azul escuro (#1e3a5f) e verde esportivo (#22c55e)
- Background: branco/cinza claro (light), slate-900 (dark)
- Cards com sombra suave e bordas arredondadas
- Badges coloridos por esporte: Football=marrom, Basketball=laranja, Soccer=verde, Volleyball=azul, Futsal=amarelo
- Badges de prioridade: high=vermelho, medium=amarelo, low=verde
- Tipografia: Inter ou system font
- Animações sutis ao gerar jogada (skeleton loading, fade-in das seções)
- Score indicator: barra de progresso com cor baseada no valor

---

## Funcionalidades Extras

- **Loading state**: ao gerar, mostrar skeleton loader com mensagem "Gerando jogada..." por ~500ms (simular processamento)
- **Toast notifications**: "Jogada salva!", "PDF baixado!", "Feedback registrado!"
- **Keyboard shortcuts**: Enter no textarea para gerar, Ctrl+S para salvar
- **Responsivo**: mobile-first, sidebar vira bottom nav
- **Suporte bilíngue**: interface em português BR, mas aceita prompts em inglês e português
