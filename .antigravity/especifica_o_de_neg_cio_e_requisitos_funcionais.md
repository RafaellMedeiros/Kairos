# Especificação de Negócio e Requisitos do Sistema (TempoDock)

## 1. Visão Geral
O **TempoDock** é um aplicativo mobile/tablet para uso pessoal focado em gamificação da gestão de tempo através de uma economia balanceada de esforço vs. lazer. O tablet opera prioritariamente em suporte de mesa (dock stand) no modo paisagem (*landscape*), servindo tanto como cronômetro de foco em tela cheia quanto como relógio minimalista OLED.

---

## 2. Economia de Tempo e Regras de Conversão

### 2.1. Taxas de Câmbio (Entradas / Crédito de Lazer)
Cada modalidade de foco converte uma fração do tempo investido em tempo de saldo de lazer disponível:

1. **Estudo / Foco Geral:**
   - **Taxa:** 50% (proporção 2:1).
   - **Exemplo:** 60 minutos de estudo geram `+30 minutos` de lazer.
2. **Manutenção (Leitura leve, tarefas operacionais, hobbies produtivos):**
   - **Taxa:** 25% (proporção 4:1).
   - **Exemplo:** 60 minutos de manutenção geram `+15 minutos` de lazer.
3. **Trabalho:**
   - **Taxa:** 50% (proporção 2:1).
   - **Teto diário estrito:** Máximo de **+02h00 de lazer geradas por dia** através de trabalho.
   - **Exemplo:** Após acumular 4 horas de trabalho cronometradas/lançadas no dia civil (00:00 às 23:59), o trabalho continua sendo registrado em histórico, mas a taxa de crédito de lazer se torna **0%** até o dia seguinte.

### 2.2. Consumo (Saídas / Débito de Lazer)
- **Taxa:** Débito direto de 100% (1:1). Cada minuto cronometrado em lazer ou lançado manualmente consome 1 minuto de saldo.
- **Controle 100% Manual:** Sem pausas forçadas ou automáticas por inatividade; o usuário controla o cronômetro explicitamente.

### 2.3. Empréstimo (Saldo Negativo / Cheque Especial)
- O usuário pode usufruir de lazer até o limite inferior absoluto de **-01h00** (-60 minutos).
- Ao atingir exatamente `-01h00`:
  - O cronômetro de lazer trava/pausa automaticamente.
  - Bloqueiam-se novos débitos de lazer (tanto cronômetro quanto manual).
- **Sem penalidades ou juros:** Para recuperar o saldo de `-01h00` até `00h00`, é necessário gerar 1h de crédito (ex: 2h de estudo líquido).

### 2.4. Ciclo Semanal e Reset de Saldo
- O fechamento do ciclo ocorre automaticamente toda **segunda-feira às 00:00 (horário local)**.
- **Regra de Transição Semanal:**
  - Se o saldo for **positivo ($\ge 0$)**: O saldo é resetado para `00h00` (o lazer não utilizado na semana anterior expira para evitar acúmulos infinitos).
  - Se o saldo for **negativo ($< 0$)**: A dívida transita intacta para a nova semana (ex: se encerrou com `-00h35`, a nova semana inicia com `-00h35`).

---

## 3. Modos Operacionais do Cronômetro

### 3.1. Cronômetro Livre
- Contagem progressiva a partir de `00:00:00`.
- Ao pausar ou finalizar, o tempo decorrido é computado e adicionado proporcionalmente ao saldo com base na categoria ativa.

### 3.2. Modo Pomodoro Fixo (25 / 5)
- **Ciclo Fixo:**
  - **Foco:** 25 minutos (contagem regressiva).
  - **Descanso:** 5 minutos (contagem regressiva).
- **Crédito de Lazer:** Apenas o bloco de 25 minutos de foco gera crédito de lazer correspondente à categoria selecionada. O descanso não debita nem credita lazer.
- **Sinalização Sonora:** Emissão de aviso sonoro discreto e notificação tátil/visual na transição de blocos.

### 3.3. Lançamento Manual (Retroativo)
Modal de inserção rápida para registrar atividades feitas longe do tablet:
- Seletor de direção: `[Ganhar Lazer (Foco)]` vs `[Gastar Lazer (Consumo)]`.
- Seletor de categoria (quando foco): `Estudo`, `Manutenção`, `Trabalho`.
- Campo de duração (horas e minutos) com botões de atalho: `15m`, `25m`, `45m`, `1h`, `2h`.
- Cálculo dinâmico exibido em tempo real antes da confirmação.
- Validação automática do teto diário de trabalho e do piso de -01h00.

### 3.4. Modo Relógio de Bancada (Dock Standby)
- Interface de descanso ultra-minimalista:
  - Exibe horas e minutos gigantes monoespaçados (ex: `14:32`).
  - Data atual por extenso em português (ex: `Sábado, 17 de Outubro`).
  - Resumo sutil de saldo no canto superior: `SALDO DE LAZER: +02h 45m | Trabalho hoje: 1h15 / 2h00`.
  - Botão discreto para retornar imediatamente ao modo foco.

---

## 4. Requisitos de Interface (UI/UX)
- **Orientação:** Estritamente Horizontal / Paisagem (*Landscape*).
- **Esquema de Cores:** Preto absoluto (#000000, OLED puro) para evitar burn-in e economizar energia.
- **Hierarquia Visual:**
  - 80% da área da tela dominada pelos dígitos do relógio/cronômetro.
  - 10% topo: Saldo, teto de trabalho diário e atalhos rápidos.
  - 10% base: Seletor de pílulas das atividades.
- **Idioma:** Estritamente Português do Brasil (pt-BR).