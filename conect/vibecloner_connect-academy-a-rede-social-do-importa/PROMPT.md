# VibeCloner — Instruções para Reprodução

## Site original

| Campo | Valor |
|-------|-------|
| URL | https://app.connectacademy.com.br/# |
| Título | Connect Academy - A Rede Social do Importador |
| Capturado em | 2026-10-15T22:19:46.637Z |
| Tecnologias | Tailwind |

## Estrutura desta pasta

```
index.html            ← MIRROR rodável (HTML servido + JS). Rode: npx serve .
snapshot.html         ← fallback visual estático (DOM renderizado, sem JS)
mirror/               ← todos os recursos por host (js, css, fontes, imagens, mídia)
  <host>/...          ← estrutura de pastas idêntica à do original
screenshots/          ← 📸 REFERÊNCIA VISUAL — olhe aqui primeiro
DESIGN.md             ← 🎨 cores, tipografia e espaçamentos REAIS (computados)
PROMPT.md             ← este arquivo
```

## 📸 Screenshots (referência visual obrigatória)

A pasta `screenshots/` tem **3 imagems** mostrando cada seção da página como ela aparece no browser.

> **Sempre use essas imagens como referência fiel do design. Elas mostram o resultado final exato que deve ser reproduzido.**

## 🎨 Paleta (CSS custom properties extraídas)

```css
:root {
  --tw-ring-color: rgb(59 130 246 / 0.5);
  --tw-shadow-color: rgb(41 52 255 / 0.2);
  --bg-primary: #000000;
  --bg-surface: #0a0a0f;
  --text-primary: #f8f8fc;
  --text-secondary: #b1b5c8;
  --border-color: #ffffff15;
  --card-bg: #0a0a0f;
  --plyr-color-main: #2934FF;
  --plyr-video-background: #000;
  --plyr-range-fill-background: #2934FF;
  --plyr-video-controls-background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, .75));
  --plyr-tooltip-background: rgba(0, 0, 0, .85);
  --plyr-tooltip-color: #fff;
}
```

## ✒️ Fontes detectadas

- Inter

## 🎬 Mídias detectadas

- **2 embed(s)** (js.stripe.com)

> Vídeos/áudios pequenos foram baixados para `assets/`; os maiores e os embeds (YouTube, etc.) mantêm a URL original no HTML. Reproduza os mesmos comportamentos (autoplay, loop, mudo) no clone.

## ✨ Efeitos de movimento

20 animação(ões) `@keyframes` capturada(s) em `styles/keyframes.css`.

> O CSS de animações (`@keyframes`, `transition`, `transform`) foi capturado e funciona no clone. Animações controladas por JavaScript (scroll-reveal, parallax, timelines) não são copiadas como código — recrie-as usando as screenshots e estas bibliotecas como referência.

## ⚙️ Como este mirror funciona

Este é um **espelho completo e rodável**: o `index.html` é o HTML servido pelo original, com **todo o JavaScript, CSS, fontes e imagens preservados** e as URLs reescritas para os arquivos locais em `mirror/`. Rode com `npx serve .` — o site funciona igual ao original (menus, carrosséis, animações-JS, etc.).

> **Não abra por `file://`** — as URLs são absolutas a partir da raiz e precisam de um servidor local.
>
> `snapshot.html` é um fallback visual estático (sem JS), caso algum script dependa de API ao vivo. Bibliotecas detectadas: Tailwind.

## 🤖 Prompts prontos para Claude Code / Cursor

### ① Reproduzir exatamente igual
Abra esta pasta no Claude Code (`claude .`) e cole:

```
Tenho nesta pasta o clone de um site (https://app.connectacademy.com.br/#).

Quero que você reproduza este site exatamente igual ao original:

1. Rode o mirror com `npx serve .` e abra no navegador para ver o site funcionando
2. Leia o index.html para entender a estrutura completa (os recursos estão em /mirror/)
3. Analise as imagens em /screenshots/ — elas mostram como cada seção deve ficar visualmente
4. Use o DESIGN.md como fonte de verdade de cores, tipografia e espaçamentos (valores reais computados)
5. Mantenha todos os layouts, animações, hover effects e responsividade
6. Substitua apenas: textos de conteúdo, nome da marca e imagens de placeholder

Tecnologias do original: Tailwind
```

### ② Adaptar para o seu produto
```
Tenho nesta pasta o clone de https://app.connectacademy.com.br/#.

Adapte este site para o meu produto:
- Meu produto: [descreva aqui]
- Minha marca: [seu nome]
- Minhas cores: [suas cores]
- Meu público: [quem é seu cliente]

Mantenha toda a estrutura de layout, UX e hierarquia visual.
Use as screenshots em /screenshots/ para entender o que cada seção comunica.
Reescreva todos os textos para o meu contexto. Substitua as imagens por descrições do que colocar.
```

### ③ Publicar após personalizar
```bash
npx vercel        # deploy em 30 segundos
# ou
npx serve .       # testar localmente na porta 3000
```

---
*Gerado por VibeCloner*
