<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Keep signed-in finance pages under the client-only authenticated layout; public account and recovery pages remain outside it because browser-held sessions cannot gate SSR.
- Load private workspace data with authenticated server functions and shared query options so the owner is verified on every read.
- Preserve originals in private Storage with owner-prefixed paths and short-lived signed previews; document metadata must never contain public file links.
- Separate document archiving from financial recognition; phase-one uploads do not create expenses or claim AI extraction.
- Use shared semantic design tokens and reusable finance components so desktop and mobile surfaces stay consistent.
- Keep AI suggestions separate from reviewed metadata, and confirm document reviews through an owner-scoped, row-locked database function so expense creation is atomic and repeat clicks cannot duplicate it.
- Run document analysis only on explicit user action through authenticated server functions, with streamed Lovable AI calls and no automatic retries after terminal failures.
- Store custom categories per owner and validate category selections on the server; AI category labels remain suggestions until a review is confirmed.
- Derive report totals and chart series from the same filtered expense rows using integer cents, excluding cancelled expenses so every report surface agrees.

- Uploads offer an explicit AI-reading selection before sending and open the uploaded document review afterward; financial records still require separate confirmation.
- Manual document reviews retain a manual source marker and use the same owner-locked confirmation as AI reviews, without creating AI extraction data.
