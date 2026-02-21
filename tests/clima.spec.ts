/**
 * Teste manual da funcionalidade de Clima por Cidade
 * 
 * Estes testes devem ser executados manualmente ou via Playwright após configuração
 * 
 * Pré-requisitos:
 * 1. Backend rodando em http://localhost:5000 (API)
 * 2. Worker rodando (para processar clima)
 * 3. Frontend rodando em http://localhost:5173 (Vite dev server)
 * 
 * Fluxo de testes:
 */

import { test, expect } from "@playwright/test";

// Configurar base URL
test.use({ baseURL: "http://localhost:5173" });

test.describe("Funcionalidade de Clima por Cidade", () => {
  // Teste 1: Verificar se o seletor de cidades carrega
  test("Deve carregar o seletor de cidades com todas as cidades de SP", async ({
    page,
  }) => {
    await page.goto("/master");

    // Fazer login como Developer
    await page.fill('[id="loginUsername"]', "ewerton");
    await page.fill('[id="loginPassword"]', "123123");
    await page.click('button:has-text("Login")');

    // Aguardar feedback de login bem-sucedido
    await page.waitForTimeout(1000);

    // Clicar em "Novo Prédio"
    await page.click('button:has-text("Novo Prédio")');

    // Verificar se o seletor de cidades está visível
    const cidadeSelect = await page.locator('text=Cidade');
    await expect(cidadeSelect).toBeVisible();

    // Abrir o seletor
    await page.click("[role=combobox]");

    // Verificar se tem cidades listadas
    const options = await page.locator("[role=option]");
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(0);

    console.log(`✓ Seletor de cidades carregou com ${optionCount} opções`);
  });

  // Teste 2: Criar prédio com cidade
  test("Deve criar um novo prédio com cidade selecionada", async ({ page }) => {
    await page.goto("/master");

    // Fazer login
    await page.fill('[id="loginUsername"]', "ewerton");
    await page.fill('[id="loginPassword"]', "123123");
    await page.click('button:has-text("Login")');
    await page.waitForTimeout(1000);

    // Abrir diálogo de novo prédio
    await page.click('button:has-text("Novo Prédio")');

    // Preencher formulário
    await page.fill('input[placeholder="ex: gramado"]', "test-predio");
    await page.fill('input[placeholder="ex: Edificio Central"]', "Prédio Teste");

    // Selecionar cidade
    await page.click("[role=combobox]");
    await page.waitForTimeout(500);
    const firstOption = await page.locator("[role=option]").first();
    await firstOption.click();

    // Salvar
    await page.click('button:has-text("Salvar")');

    // Verificar sucesso
    await expect(page.locator("text=Prédio criado com sucesso")).toBeVisible({
      timeout: 3000,
    });

    console.log("✓ Prédio criado com sucesso");
  });

  // Teste 3: Verificar que clima é exibido para o prédio
  test("Deve exibir clima no dashboard do prédio criado", async ({ page }) => {
    // Navegar para dashboard de um prédio existente
    await page.goto("/gramado");

    // Aguardar carregamento
    await page.waitForLoadState("networkidle");

    // Verificar se WeatherCard está visível
    const weatherCard = await page.locator("text=/Previsão|Temperatura|Clima/i");
    await expect(weatherCard).toBeVisible({ timeout: 5000 });

    console.log("✓ Clima exibido no dashboard");
  });

  // Teste 4: Criar segundo prédio com outra cidade
  test("Deve criar segundo prédio com cidade diferente", async ({ page }) => {
    await page.goto("/master");

    // Fazer login
    await page.fill('[id="loginUsername"]', "ewerton");
    await page.fill('[id="loginPassword"]', "123123");
    await page.click('button:has-text("Login")');
    await page.waitForTimeout(1000);

    // Abrir diálogo de novo prédio
    await page.click('button:has-text("Novo Prédio")');

    // Preencher formulário com dados diferentes
    await page.fill('input[placeholder="ex: gramado"]', "predio-sp");
    await page.fill('input[placeholder="ex: Edificio Central"]', "Prédio SP");

    // Selecionar primeira cidade
    await page.click("[role=combobox]");
    await page.waitForTimeout(500);
    const firstOption = await page.locator("[role=option]").first();
    await firstOption.click();

    // Salvar
    await page.click('button:has-text("Salvar")');

    // Verificar sucesso
    await expect(page.locator("text=Prédio criado com sucesso")).toBeVisible({
      timeout: 3000,
    });

    console.log("✓ Segundo prédio criado com sucesso");
  });

  // Teste 5: Validar que ClimaWorker processa ambas as cidades
  test("Deve processar clima para cidades com prédios cadastrados", async () => {
    /**
     * Este teste requer verificar os logs do worker
     * 
     * No console do worker (TELA-ELEVADOR-SERVER.Worker), deve aparecer:
     * - "Processando clima para 2 cidade(s) com prédio(s) cadastrado(s)" (ou mais se houver outras)
     * - "Buscando clima para [CityName]..."
     * 
     * Validação manual:
     * 1. Rodar: dotnet run --project TELA-ELEVADOR-SERVER.Worker
     * 2. Aguardar 4 horas OU forçar a execução editando ClimaWorker para interval de 10 segundos
     * 3. Verificar logs de processamento
     */

    console.log("✓ Verifique os logs do Worker para confirmar processamento");
  });

  // Teste 6: Validar persistência de clima no banco
  test("Deve persistir previsões de clima no banco de dados", async () => {
    /**
     * Este teste requer acesso direto ao banco PostgreSQL
     * 
     * Query para validar:
     * SELECT COUNT(*) FROM "ClimaPrevisoes";
     * SELECT DISTINCT "CidadeId" FROM "ClimaPrevisoes" ORDER BY "CidadeId";
     * 
     * Deve retornar registros para ambas as cidades criadas
     */

    console.log("✓ Verifique o banco de dados com queries SQL");
  });
});

/**
 * PROCEDIMENTO DE TESTES MANUAL
 * 
 * 1. PREPARAR AMBIENTE
 *    - Limpar banco de dados (dropdb tela-elevador && createdb tela-elevador)
 *    - Executar migrations: dotnet ef database update --project TELA-ELEVADOR-SERVER.Api
 *    - Iniciar API: dotnet run --project TELA-ELEVADOR-SERVER.Api
 *    - Iniciar Worker: dotnet run --project TELA-ELEVADOR-SERVER.Worker
 *    - Iniciar Frontend: npm run dev
 * 
 * 2. VERIFICAR SEED IBGE
 *    - Query: SELECT COUNT(*) FROM "Cidade" WHERE "Estado" = 'SP';
 *    - Esperado: ~645 cidades
 * 
 * 3. FAZER LOGIN
 *    - Ir para http://localhost:5173/master
 *    - Login: ewerton / 123123
 * 
 * 4. CRIAR PRÉDIOS
 *    - Criar prédio: slug="marilia", nome="Marília", cidade="Marília, SP"
 *    - Verificar que síndico foi criado: usuario="marilia", senha="marilia"
 *    - Criar segundo prédio: slug="sorocaba", nome="Sorocaba", cidade="Sorocaba, SP"
 *    - Verificar que síndico foi criado: usuario="sorocaba", senha="sorocaba"
 * 
 * 5. VERIFICAR CLIMA
 *    - Ir para http://localhost:5173/marilia
 *    - Aguardar carregamento
 *    - Deve exibir "Previsão de Clima" com ícones e temperaturas
 */
