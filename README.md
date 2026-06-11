# Shannon
![HTML5](https://shields.io)
![CSS3](https://shields.io)
![JavaScript](https://shields.io)

Simulação acadêmica para Global Solution / FIAP de uma plataforma fictícia de computação
orbital sob demanda. São duas páginas estáticas:

**Clique para abrir o site:** [https://maddoxyy.github.io/shannon/](https://maddoxyy.github.io/shannon/)

- `index.html` — site de apresentação (landing).
- `dashboard/index.html` — console conceitual de um cliente enterprise ("Claude"):
  capacidade contratada, workloads, órbita dedicada, financeiro e suporte.

Roda no navegador, sem backend. Os dados são simulados (objeto `state` em
`assets/dashboard.js`) e a assistente "Betty" responde a partir de uma base de perguntas
pré-definidas — sem IA e sem rede.

## Como rodar

Abra `index.html` no navegador. Para os caminhos relativos e o `sessionStorage` se
comportarem como em produção, prefira servir a pasta:

```
python -m http.server 8000
```

E acesse `http://localhost:8000/`.

## Estrutura

```
index.html              landing
dashboard/index.html    console
assets/
  base.css              reset + fonte (compartilhado pelas duas páginas)
  styles.css            landing
  dashboard.css         console
  betty.css             Betty (usada nas duas páginas)
  app.js                interações da landing
  dashboard.js          estado e render do console
  betty.js              widget da Betty
  images/               imagens e vídeo do hero
```

## Decisões e limitações

- Site estático: sem build, sem dependências, sem testes automatizados. A verificação é
  manual, no navegador.
- `base.css` concentra o que as duas páginas têm em comum (reset, fonte, foco). As paletas
  de cor são propositalmente diferentes e ficam em cada arquivo de página.
- A tipografia vem do Google Fonts via `@import`, então depende de rede.
- Nada vai para servidor: formulários e a Betty processam tudo localmente.
- O vídeo do hero (`assets/images/shannon-hero-orbit.mp4`) é pesado (~50 MB). Num projeto
  de produção ele seria comprimido; aqui ficou como está.
