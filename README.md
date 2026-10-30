# Paraguai Academy — Landing de captura + Página de obrigado

HTML, CSS e JavaScript puros. Sem framework, sem build, sem dependência externa
além das fontes do Google.

```
ParaguaiAcademy/
├── index.html                  Página 1 — captura
├── obrigado.html               Página 2 — obrigado
├── politica-privacidade.html   Modelo de política (revise com seu jurídico)
├── assets/
│   ├── style.css               Identidade visual extraída do PDF
│   ├── form.js                 Máscara, validação, UTMs e envio
│   └── obrigado.js             Personalização com o primeiro nome
└── apps-script/
    └── Codigo.gs               Recebedor dos leads na planilha
```

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
  PAGINA_OBRIGADO: 'obrigado.html'
};
```

> **Formato do envio:** JSON com `Content-Type: text/plain`. É o que evita o
> preflight de CORS, que o Apps Script não responde. Se trocar para
> `application/json`, o envio passa a falhar silenciosamente.

---

## 2. Configurar o Pixel da Meta

Em **`index.html`** e **`obrigado.html`**, troque `[PIXEL_ID]` pelo ID numérico
do seu pixel. Aparece em 3 lugares por arquivo (script, `noscript` e a URL da
imagem). Um Localizar/Substituir em cada arquivo resolve.

- `PageView` dispara ao carregar as duas páginas.
- **`Lead`** dispara no envio do formulário (`assets/form.js`), junto com o
  `content_category` = o que a pessoa quer importar — dá para otimizar campanha
  por tipo de produto.
- Enquanto o `[PIXEL_ID]` não for trocado, o script fica inerte e não carrega
  nada. Nada quebra.

Para testar: instale a extensão **Meta Pixel Helper** no Chrome e envie o
formulário.

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
| Link do Grupo VIP | `assets/obrigado.js`, variável `LINK_DO_GRUPO` (já está com o seu link) |
| Nome da empresa no rodapé | `index.html` e `obrigado.html`, elemento `.site-footer` |
| E-mail de contato da LGPD | `politica-privacidade.html`, seção 8 |
| Texto do botão principal | `index.html`, `#submit-btn` |
| Cor do botão da página de obrigado | `assets/style.css`, classe `.btn-whats` (troque para `.btn-primary` no HTML se quiser azul) |

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
- [ ] `[PIXEL_ID]` trocado nos dois HTMLs
- [ ] Envio de teste pelo celular → linha aparece na planilha → redireciona para
      `obrigado.html?nome=...` com o nome certo no título
- [ ] Botão do grupo abre o WhatsApp no celular
- [ ] Testado em 360px de largura (DevTools → Galaxy S8+ ou largura 360)
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
