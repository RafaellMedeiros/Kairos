# Diretrizes Técnicas e Boas Práticas de Desenvolvimento

Este documento rege a qualidade de código, padrões de arquitetura e decisões de engenharia para o agente no **AntiGravity Desktop**.

> **Regras Operacionais Permanentes:**
> - **Status do Progresso:** Sempre atualizar `.antigravity/checklist_e_plano_de_execu_o_do_agente.md` e `.antigravity/tasks.md` com `[x] OK` imediatamente após concluir cada item.
> - **Design e Telas com MCP Stitch:** Sempre que for construir uma tela ou componente visual de tela, consultar o MCP do **Stitch** (`stitch`).

---

## 1. Stack Tecnológico e Dependências Obrigatórias

- **Core:** Expo SDK (versão mais recente estável) com React Native e TypeScript em modo estrito (`strict: true`).
- **Gerenciamento de Estado:** Zustand (ou React Context API com hooks bem encapsulados) para estado leve e sem boilerplate excessivo.
- **Persistência Local:** `@react-native-async-storage/async-storage` (ou `react-native-mmkv`), encapsulado sob uma camada de abstração (Service Repository).
- **Hardware e Sistema do Tablet:**
  - `expo-screen-orientation`: Travar obrigatoriamente a orientação em `LANDSCAPE`.
  - `expo-keep-awake`: Manter a tela ligada ininterruptamente quando o app estiver em primeiro plano.
  - `expo-av`: Emissão de bips discretos ao concluir blocos de Pomodoro.
- **Estilização:** `StyleSheet.create` com constantes tipadas para paleta OLED (#000000, #10B981, #EF4444, #F59E0B) ou `NativeWind` (Tailwind CSS para React Native).

---

## 2. Princípios de Arquitetura de Software

### 2.1. Separação de Responsabilidades (Clean Architecture Simplificada)
Estruture o projeto em camadas limpas dentro de `src/`:
```text
src/
├── domain/            # Modelos e regras de cálculo puras (sem dependências de UI)
│   ├── calculator.ts  # Funções puras de conversão (50%, 25%, teto de trabalho, -1h)
│   └── types.ts       # Tipos e interfaces estritas do domínio
├── services/          # Integração externa (armazenamento, áudio, orientação)
│   ├── storage.ts     # Abstração do AsyncStorage / MMKV
│   └── audio.ts       # Tocador de alertas do Pomodoro via expo-av
├── stores/            # Estado global da aplicação (Zustand ou Hooks)
│   └── useAppStore.ts # Controle do saldo, timer ativo, resets semanais
├── hooks/             # Hooks auxiliares (useTimer, useKeepAwake, useClock)
├── components/        # Componentes visuais atômicos e minimalistas
│   ├── HeaderStatus.tsx
│   ├── TimerDisplay.tsx
│   ├── ModeSelector.tsx
│   ├── StandbyClock.tsx
│   └── ManualEntryModal.tsx
└── screens/           # Telas principais (MainScreen, StandbyScreen)
```

### 2.2. Regras Puras Desacopladas (Domain Layer)
- As funções matemáticas que calculam rendimento de lazer, validação de teto de trabalho e virada de semana devem ser **funções puras** e isoladas, permitindo testes unitários fáceis.
- Exemplo de assinatura esperada:
  ```typescript
  export function calculateEarnedMinutes(
    category: FocusCategory,
    durationInMinutes: number,
    currentDailyWorkEarnedMinutes: number
  ): { earnedMinutes: number; updatedDailyWorkMinutes: number };
  ```

---

## 3. Padrões de Código e TypeScript

1. **TypeScript Rigoroso:** Proibido o uso de `any`. Utilize `unknown` com validação de tipo ou generics tipados.
2. **Imutabilidade:** Nunca mutar o estado diretamente; sempre utilizar cópias imutáveis.
3. **Tratamento de Datas e Resets:**
   - Armazene timestamps em formato ISO ou UTC epoch (`number`).
   - Para verificar o reset semanal da segunda-feira, implemente um utilitário que compare a data do último reset armazenada com o timestamp da virada da última segunda-feira 00:00.
4. **Precisão de Cronômetro em Segundo Plano:**
   - Não confie puramente em `setInterval` somando `+1s` (intervalos de JavaScript sofrem drifting quando a thread engasga).
   - Calcule a diferença entre `Date.now()` e o `startTimestamp`.
5. **Prevenção de Burn-In OLED:**
   - Elementos estáticos na tela (como separadores ou títulos) devem ter opacidade moderada ou transições sutis de posição periódicas (anti burn-in pixel shift discreto).