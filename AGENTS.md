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

- Academy study workspaces persist in browser localStorage and pass one-time Ask prompts through sessionStorage, keeping study handoffs independent of assistant streaming and saved conversations.
- Study upload metadata stays local; session-only blob reading links are revoked on removal or unmount, and inline study questions use the existing authenticated streaming endpoint with references and notes, never claiming access to unread files.
- Launch watch-link eligibility is computed by a shared browser-safe timing helper so cards and boundary tests apply the same launch window.
- Tracker comparisons resolve out-of-group IDs through the shared satellite query cache so saved comparisons survive group changes and reopening.
- Admin inbox operations use authenticated server functions with both verified email allowlisting and the protected admin role; the shell mounts one signed-in error reporter to collect failures without duplicating listeners.
