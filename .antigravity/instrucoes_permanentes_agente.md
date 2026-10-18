# Instruções Permanentes do Agente (Regra de Ouro)

> [!IMPORTANT]
> Este arquivo deve ser lido e respeitado em **todas** as etapas de desenvolvimento do projeto **Kairos (TempoDock)**.

## 1. Atualização Contínua de Status do Progresso
- **SEMPRE** que concluir um item do checklist (mesmo um subitem individual como `1.1`, `1.2`, etc.), atualize **imediatamente** os arquivos de checklist:
  - `.antigravity/checklist_e_plano_de_execu_o_do_agente.md`
  - `.antigravity/tasks.md`
- Marque a caixa correspondente de `- [ ]` para `- [x] OK`.
- Nunca avance para várias tarefas seguidas sem antes registrar o progresso concluído no checklist.

## 2. Uso Obrigatório do MCP do Stitch para Construção de Telas
- **SEMPRE** que for construir uma tela (`screens/`) ou componentes visuais estruturais de tela (`components/`), **consulte o MCP do Stitch (`stitch`)** antes/durante a implementação.
- Utilize as ferramentas do servidor MCP `stitch` (`list_projects`, `get_project`, `list_screens`, `get_screen`, `generate_screen_from_text`, etc. em `C:\Users\rafae\.gemini\antigravity\mcp\stitch`) para buscar referências, inspecionar ou gerar os designs das telas garantindo fidelidade visual OLED Landscape.
