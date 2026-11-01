# Paraguai Academy — Landing de captura + Grupo VIP

HTML, CSS e JavaScript puros. Sem framework, sem build, sem dependência externa
além das fontes do Google.

```
ParaguaiAcademy/
├── index.html                  Captura — formulário que grava na planilha
├── cadastro-concluido.html     Fim do formulário — "falta 1 passo: entre no grupo"
├── obrigado.html               Entrada no grupo para tráfego frio (destino dos anúncios)
├── baixar.html                 Download direto do PDF
├── politica-privacidade.html   Modelo de política (revise com seu jurídico)
├── assets/
│   ├── style.css               Identidade visual extraída do PDF
│   ├── form.js                 Máscara, validação, UTMs e envio
│   ├── grupo.js                Link do Grupo VIP + copiar link + ClicouGrupoVIP
│   ├── cadastro-concluido.js   Personalização com o primeiro nome
│   └── obrigado.js             Contador da prova social
└── apps-script/
    └── Codigo.gs               Recebedor dos leads na planilha
```

## As duas páginas do grupo

São duas porque o público é diferente — e os eventos do Pixel também:

| Página | Quem chega | Eventos |
|---|---|---|
| `cadastro-concluido.html` | quem **acabou de preencher** o formulário | `PageView` + `CompleteRegistration` |
| `obrigado.html` | quem vem **direto do anúncio**, sem formulário | `PageView` + `ViewContent` |

`obrigado.html` manteve a URL antiga porque os anúncios apontam para ela. Ela
**nunca** dispara `Lead` nem `CompleteRegistration`: essas pessoas não se
cadastraram, e um lead falso ali estragaria a otimização da campanha.

O link do grupo fica em **uma única constante**: `LINK_DO_GRUPO`, no começo de
`assets/grupo.js`. Os `href` escritos no HTML são apenas reserva para o caso de
o JavaScript não carregar — o valor real vem sempre da constante.

---

## Identidade visual (extraída do PDF)

| Item | Valor |
|---|---|
| Fonte dos títulos | **Poppins** 700/800 (equivalente mais próximo no Google Fonts) |
| Fonte do texto | **Inter** 400/500/600 |
| Cor principal | `#0B2A5B` azul-marinho — botão principal, títulos |
| Cor secundária | `#0F7A3D` verde — checks, botão do WhatsApp |
| Cor de destaque | `#F4B223` amarelo/ouro — badges, palavras em destaque |
| Cor de fundo | `#071E45` → `#143A7B` gradiente azul-marinho |
| Cor do texto | `#13284F` sobre branco · `#FFFFFF` e `#AEC0DD` sobre azul |

Cantos: cards 18px, botões e badges em pílula. Sombras suaves azuladas.
Todos os pares de cor usados passam no contraste AA (mínimo 5,4:1).

---

## 1. Ligar o formulário à planilha que você já usa

Esta landing **reaproveita o Apps Script e a URL `/exec` dos outros sites**. Não
crie planilha nova nem implantação nova. O roteamento é pelo campo `evento` do
corpo da requisição:

| `evento` enviado | Onde grava |
|---|---|
| ausente | primeira aba — leads dos sites antigos |
| `clique-whatsapp` | aba `Cliques WhatsApp` |
| **`lead-paraguai`** | aba **`Leads Paraguai`** ← esta landing |

### 1.1 Atualizar o script
1. Abra a planilha de leads → **Extensões → Apps Script**.
2. **Ctrl+A**, **Delete** e cole todo o conteúdo de `apps-script/Codigo.gs`.
   Ele já inclui as funções antigas (`gravarLead`, `gravarClique`) inalteradas.
3. **Ctrl+S**.

> Não precisa criar a aba nem as colunas: `abaDoParaguai()` cria a aba
> `Leads Paraguai` com o cabeçalho na primeira gravação.

### 1.2 Testar sem usar o site
1. No seletor de função, escolha **`testarParaguai`** → **▶ Executar**.
2. Confira a aba `Leads Paraguai` com a linha de teste. Apague-a depois.

Se o Google pedir autorização de novo, é normal — o script passou a mexer em
uma aba nova.

### 1.3 Republicar (sem trocar a URL)
**Implantar → Gerenciar implantações → ✏️ editar → Versão: Nova versão →
Implantar.**

Usar *Gerenciar implantações* e não *Nova implantação* é o que mantém a URL
`/exec` igual — assim os outros sites continuam funcionando sem nenhum ajuste.

### 1.4 Ligar o site ao script
Abra `assets/form.js` e cole a MESMA URL `/exec` dos outros sites:

```js
var CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfy..../exec',
  EVENTO: 'lead-paraguai',   // não apague: é o que separa a aba
  SEGREDO: '',               // só se você usa SHARED_SECRET
  PAGINA_FINAL: 'cadastro-concluido.html'   // não troque para obrigado.html
};
```

> **Formato do envio:** JSON com `Content-Type: text/plain`. É o que evita o
> preflight de CORS, que o Apps Script não responde. Se trocar para
> `application/json`, o envio passa a falhar silenciosamente.

---

## 2. Rastreamento do Meta

Pixel **`1888863052133186`**, já ativo nas cinco páginas (`index`,
`cadastro-concluido`, `obrigado`, `baixar`, `politica-privacidade`).

### 2.1 Quando cada evento dispara

| Evento | Onde | Quando |
|---|---|---|
| `PageView` | todas as páginas | ao carregar |
| **`Lead`** | `assets/form.js` | **só depois** do Apps Script confirmar o envio |
| `CompleteRegistration` | `cadastro-concluido.html` | ao carregar o fim do formulário |
| `ViewContent` | `obrigado.html` | ao carregar a página de tráfego frio |
| `ClicouGrupoVIP` | `assets/grupo.js` | clique em qualquer botão do grupo ou em "Copiar link" |
| `BaixouPDF` | `baixar.html` | clique no botão de download |

O `Lead` dispara **uma vez por cadastro**, na página de captura — não nas
páginas do grupo. É o evento que a campanha de Leads usa para otimizar.

O `Lead` **não** dispara no clique do botão nem quando o envio falha. A ordem
no `form.js` é: envia → confirma → dispara o `Lead` → espera 300 ms → só então
redireciona. Os 300 ms existem para o `fbq` despachar antes da troca de página,
senão o evento se perde.

Clique duplo não gera dois leads: há uma trava `enviando` no formulário e uma
trava `leadDisparado` no próprio evento.

### 2.2 Desduplicação

Cada envio gera um `event_id` único (`crypto.randomUUID()`). O mesmo id vai
para três lugares:

```
navegador  fbq('track','Lead', {...}, { eventID })
servidor   /api/meta-lead  →  Meta CAPI  (event_id)
planilha   coluna event_id
```

É isso que faz o Meta receber o evento por dois caminhos e contar **um** lead.
A coluna na planilha serve para você conferir um lead específico contra o
Gerenciador de Eventos.

### 2.3 Origem do anúncio

Capturados da URL e gravados na planilha: `utm_source`, `utm_medium`,
`utm_campaign`, `utm_content`, `utm_term`, `fbclid`, `fbp`, `fbc`.

Use esta estrutura nos anúncios:

```
utm_source=meta&utm_medium=pago&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}
```

`_fbp` e `_fbc` são cookies criados pelo próprio Pixel, lidos na hora do envio.
Se o `_fbc` ainda não existir mas houver `fbclid` na URL, ele é montado no
formato `fb.1.<timestamp>.<fbclid>`.

---

## 3. API de Conversões (envio pelo servidor)

`api/meta-lead.js` é uma função serverless da Vercel. Ela manda o mesmo `Lead`
pelo servidor, o que recupera os eventos que o navegador perde (bloqueador de
anúncio, iOS restrito, aba fechada cedo).

Dados enviados: `event_name`, `event_id`, `event_time`, `action_source`,
`event_source_url`, `client_ip_address`, `client_user_agent`, `fbp`, `fbc`,
telefone com hash em `ph` e primeiro nome com hash em `fn`.

O telefone é normalizado antes do hash (só dígitos, com `55` na frente:
`(11) 91234-5678` → `5511912345678`) e o nome vai minúsculo e sem acento
(`João` → `joao`). O hash é SHA-256, como o Meta exige.

### 3.1 Criar o token

1. [business.facebook.com/events_manager](https://business.facebook.com/events_manager)
2. Selecione o pixel **1888863052133186**
3. Aba **Configurações** → role até **API de Conversões**
4. **Gerar token de acesso** → copie. Ele aparece **uma vez só**.

### 3.2 Cadastrar as variáveis na Vercel

No painel do projeto: **Settings → Environment Variables**. Marque os três
ambientes (Production, Preview, Development).

| Nome | Valor |
|---|---|
| `META_PIXEL_ID` | `1888863052133186` |
| `META_CAPI_TOKEN` | o token do passo 3.1 |
| `META_TEST_EVENT_CODE` | opcional, só durante os testes (ex.: `TEST12345`) |

Depois de salvar, faça um **Redeploy** — variáveis novas só valem em
implantações novas.

> **O token nunca entra no repositório nem no código do navegador.** Ele só
> existe como variável de ambiente na Vercel. Se vazar, revogue no Gerenciador
> de Eventos e gere outro.

### 3.3 Se a API falhar

O formulário continua funcionando. A função sempre responde 200 e registra o
motivo no log da Vercel; o `form.js` chama com `keepalive` e ignora a resposta.
Sem as variáveis cadastradas, o lead ainda é gravado na planilha e o Pixel do
navegador ainda dispara — você só perde a metade servidor da desduplicação.

### 3.4 Código de teste

Enquanto `META_TEST_EVENT_CODE` estiver preenchida, os eventos aparecem em
**Gerenciador de Eventos → Testar eventos**. **Apague a variável quando
terminar os testes** — eventos de teste não contam para otimização de campanha.

---

## 3. Trocar a capa do PDF pela imagem real

A capa que aparece na página hoje é um mockup em HTML/CSS — funciona sem
nenhum arquivo de imagem. Para usar a capa real:

1. Exporte a página 1 do PDF como PNG ou JPG (largura ~640px basta) e salve em
   `assets/capa-guia.png`.
2. Em `index.html`, localize o bloco `<div class="cover-area">` e troque todo o
   conteúdo interno por:

```html
<div class="cover-area">
  <img src="assets/capa-guia.png"
       alt="Capa do guia Importe Sem Sair de Casa"
       class="cover-img" width="320" height="452">
</div>
```

O CSS da classe `.cover-img` já aplica os mesmos cantos, sombra e inclinação.

---

## 4. Outros ajustes rápidos

| O que | Onde |
|---|---|
| **Link do Grupo VIP** | `assets/grupo.js`, constante `LINK_DO_GRUPO` — vale para as duas páginas do grupo |
| Nº de pessoas na prova social | `assets/obrigado.js`, constante `PESSOAS_NO_GRUPO` |
| Preenchimento da barra de progresso | `cadastro-concluido.html`, `.progresso-barra` (mude o `width` e o `aria-valuenow` juntos) |
| Nome da empresa no rodapé | elemento `.site-footer` em cada HTML |
| E-mail de contato da LGPD | `politica-privacidade.html`, seção 8 |
| Texto do botão principal | `index.html`, `#submit-btn` |
| Cor dos botões do grupo | `assets/style.css`, classe `.btn-whats` (troque para `.btn-primary` no HTML se quiser azul) |

---

## 5. Colocar no ar

Qualquer hospedagem de arquivos estáticos serve. As três mais rápidas:

**Netlify Drop (sem conta, 1 minuto)**
1. Acesse [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arraste a pasta `ParaguaiAcademy` inteira para a página.
3. Pronto — você recebe uma URL `https://algo.netlify.app`. Dá para apontar um
   domínio próprio depois, em *Domain settings*.

**Vercel**
1. `npm i -g vercel` → `vercel` dentro da pasta → siga as perguntas.
2. Ou suba a pasta para um repositório no GitHub e importe em vercel.com.

**Hospedagem tradicional (cPanel/FTP)**
1. Envie os arquivos para a pasta `public_html`.
2. Mantenha a estrutura: `index.html` na raiz e a pasta `assets/` ao lado.

> **Precisa ser HTTPS.** O WhatsApp e o Pixel só funcionam bem em HTTPS, e o
> navegador pode bloquear o envio ao Apps Script em HTTP. Netlify e Vercel já
> entregam HTTPS automático.

---

## 6. Checklist antes de anunciar

- [ ] `APPS_SCRIPT_URL` preenchida em `assets/form.js` (a mesma dos outros sites)
- [ ] `Codigo.gs` atualizado no Apps Script e **republicado por Gerenciar
      implantações** (URL inalterada)
- [ ] Um envio de teste nos **sites antigos** ainda caindo na primeira aba
- [ ] `[PIXEL_ID]` trocado em todos os HTMLs
- [ ] Envio de teste pelo celular → linha aparece na planilha → redireciona para
      `cadastro-concluido.html?nome=...` com o nome certo na frase de apoio
- [ ] No Meta Pixel Helper: `Lead` **uma vez** por cadastro, e
      `CompleteRegistration` em `cadastro-concluido.html`
- [ ] `obrigado.html` aberta direto mostra só `PageView` + `ViewContent`
      (nenhum `Lead`)
- [ ] Botão do grupo abre o WhatsApp no celular e dispara `ClicouGrupoVIP`
- [ ] "Copiar link do grupo" mostra "Link copiado!" e cola o link certo
- [ ] Testado em 360px de largura (DevTools → Galaxy S8+ ou largura 360), com o
      botão fixo do rodapé sem cobrir a Política de Privacidade
- [ ] E-mail de contato trocado na política de privacidade
- [ ] Linha de teste apagada da planilha

### Como testar as UTMs
Abra a página com parâmetros e envie o formulário:

```
https://seusite.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=guia-outubro
```

As três colunas devem chegar preenchidas na planilha. As UTMs ficam guardadas na
`sessionStorage`, então sobrevivem se a pessoa navegar até a política de
privacidade e voltar.

---

## 7. Detalhes técnicos que já estão resolvidos

- **Máscara de WhatsApp** `(00) 00000-0000`, aceita colar número com `+55`,
  espaços ou traços.
- **Validação**: 11 dígitos, DDD ≥ 11 e nono dígito começando com 9. Mensagens
  em português, foco automático no primeiro campo com erro.
- **Botão** entra em estado `Enviando...` e trava novo clique; volta ao normal
  se o envio falhar, com mensagem de erro.
- **Rede lenta não perde lead**: se o Apps Script demorar mais de 6 segundos, a
  pessoa é redirecionada mesmo assim (a requisição continua em andamento).
- **CORS**: o envio tenta o modo normal e, se o navegador bloquear, reenvia em
  `no-cors`. Funciona nos dois cenários.
- **Chips** (botões de toque único) são acessíveis: `role="radiogroup"`,
  navegação por setas, foco visível.
- **Nome na URL** é sanitizado e inserido com `textContent` — não é possível
  injetar HTML pela query string.
- **Campos de 52px e fonte de 16px** nos inputs: o iPhone não dá zoom ao focar.
- **Fontes** carregam com `display=swap`; o texto aparece antes do download.
