# Checklist de Execução do Projeto TempoDock (Kairos)

> **Instrução para o Agente AntiGravity:**
> 1. **Atualização Contínua de Progresso:** Execute cada tarefa em ordem sequencial. Assim que concluir com sucesso a implementação e validação de um item, edite **imediatamente** este arquivo (e `.antigravity/tasks.md`) marcando a caixa correspondente de `[ ]` para `[x] OK`.
> 2. **Consulta Obrigatória ao MCP do Stitch:** Sempre que for construir uma tela ou componente visual de tela (Fase 4 e Fase 5), consulte obrigatoriamente o MCP do **Stitch** (`stitch`).
> 3. Consulte `.antigravity/instrucoes_permanentes_agente.md` para detalhes.

---

## Fase 1: Inicialização e Setup do Ambiente
- [x] OK 1.1 Inicializar o projeto Expo com template TypeScript (`npx create-expo-app@latest tempo-dock --template blank-typescript`).
- [x] OK 1.2 Instalar as dependências nativas e utilitárias: `expo-keep-awake`, `expo-screen-orientation`, `expo-av`, `@react-native-async-storage/async-storage`, `zustand`.
- [x] OK 1.3 Configurar o `app.json` para bloquear rotação de tela inicial e definir o tema escuro padrão.
- [x] OK 1.4 Estruturar a árvore de diretórios conforme `guidelines_boas_praticas.md` (`src/domain`, `src/services`, `src/stores`, `src/components`, `src/screens`).

---

## Fase 2: Domínio e Regras de Negócio (Lógica Pura)
- [x] OK 2.1 Definir tipos globais em `src/domain/types.ts` (`FocusCategory`, `TimerMode`, `AppStatus`, `TimeLog`).
- [x] OK 2.2 Criar em `src/domain/calculator.ts` as regras matemáticas de conversão:
  - Estudo (+50%).
  - Manutenção (+25%).
  - Trabalho (+50% limitado ao teto diário de +2h de lazer).
  - Débito de lazer (1:1 com piso de -01h00).
- [x] OK 2.3 Implementar função de verificação do ciclo semanal:
  - Reset toda segunda-feira 00:00.
  - Zera se saldo positivo; transporta a dívida se saldo negativo.
- [x] OK 2.4 Criar testes unitários para validar todas as regras do domínio (conversão, teto diário, piso de -1h e reset semanal).

---

## Fase 3: Camada de Serviços e Estado Global
- [x] OK 3.1 Implementar `src/services/storage.ts` encapsulando leitura e gravação segura no `AsyncStorage`.
- [x] OK 3.2 Implementar `src/services/audio.ts` para carregar e reproduzir os avisos sonoros de fim de bloco Pomodoro.
- [x] OK 3.3 Implementar a store global (`src/stores/useAppStore.ts` com Zustand):
  - Estado: `balanceMinutes`, `dailyWorkEarnedMinutes`, `activeMode`, `activeCategory`, `timerState`.
  - Ações: `startTimer`, `pauseTimer`, `stopAndSave`, `addManualEntry`, `checkWeeklyReset`.
- [x] OK 3.4 Configurar travamento permanente no modo paisagem e ativação do `KeepAwake` ao inicializar a store/app.

---

## Fase 4: Implementação dos Componentes Visuais (Estilo OLED Dock)
- [x] OK 4.1 Criar componente `HeaderStatus.tsx`:
  - Saldo de Lazer em destaque (`+02h 45m` ou `-00h 30m`).
  - Indicador do teto de trabalho diário (`Trabalho hoje: Xh / 2h00`).
  - Botão de alternar para modo Relógio de Bancada e botão `+ Lançamento Manual`.
- [x] OK 4.2 Criar componente `TimerDisplay.tsx`:
  - Dígitos gigantes centralizados (80% da tela) com alta visibilidade.
  - Seletor minimalista `[Cronômetro Livre]` vs `[Pomodoro 25/5]`.
  - Botões circulares limpos de Play/Pause e Parar/Salvar.
- [x] OK 4.3 Criar componente `ModeSelector.tsx`:
  - Pílulas inferiores: `[Estudo +50%]`, `[Manutenção +25%]`, `[Trabalho +50%]`, `[Gastar Lazer]`.
- [x] OK 4.4 Criar componente `StandbyClock.tsx` (Modo Relógio de Bancada):
  - Hora atual grande monoespaçada, data em pt-BR e botão de volta ao foco.
- [x] OK 4.5 Criar modal `ManualEntryModal.tsx`:
  - Alternância entre Ganhar (Foco) e Gastar (Lazer).
  - Campo numérico, chips de atalho e prévia da conversão antes de salvar.

---

## Fase 5: Integração, Testes e Polimento
- [x] OK 5.1 Integrar as telas no `App.tsx` alternando fluidamente entre o Painel Principal e o Modo Relógio.
- [x] OK 5.2 Validar o comportamento do piso de `-01h00` travando o consumo em tempo real.
- [x] OK 5.3 Validar a persistência: fechar o app, reabrir e constatar persistência íntegra do saldo e registros.
- [x] OK 5.4 Testar no tablet em suporte físico para validar ergonomia de toque e legibilidade a 1 metro.