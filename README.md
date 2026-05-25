# gilb.ai

Public landing page for **Gilbreth** — the photograph of on-computer work, modernised for AI transformation discovery.

Live at **[gilb.ai](https://gilb.ai)** (GitHub Pages, custom domain).

Single-file static site. No build step.

## Editing

The authoritative source for this site lives in the internal `workspace` repo
under `gilb.ai/`. Variants and design history are kept there. This public
repository ships only the live version.

To update:

```bash
cp /path/to/workspace/gilb.ai/index.html ./index.html
git commit -am "Update landing"
git push
```
