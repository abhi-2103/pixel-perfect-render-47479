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

- Moderation scoring lives in src/lib/moderation.ts (in-browser rule engine) and demo data in src/data/*.json converted from the uploaded datasets; swap for a server AI call when a backend is added.
- Moderation analysis runs server-side via AI (src/lib/ai-moderation.functions.ts) for text/image/video/voice; the browser only prepares media (frames, audio) — keeps the AI key off the client.
