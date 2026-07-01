# Huey HQ

Huey HQ is Huey Roundtree's cloud-based entrepreneur operating system for daily execution, CRM, revenue, content, scripts, automations, and Notion sync.

## Production

- **Production app:** [GitHub Pages](https://hueyroundtree-cmd.github.io/huey-hq-business-os/)
- **Production backend:** owned Supabase project `mqmskpdduwbiypepzkvc`
- **Lovable:** design and prototyping only; it is not a production host for Huey HQ

> [!WARNING]
> Do not deploy Huey HQ through Lovable Cloud unless it supports the owned Supabase backend `mqmskpdduwbiypepzkvc`. A Lovable deployment without that backend is not production-ready and must not be presented as the official app.

## Local Development

Create a local `.env` file with:

```dotenv
VITE_SUPABASE_PROJECT_ID="mqmskpdduwbiypepzkvc"
VITE_SUPABASE_URL="https://mqmskpdduwbiypepzkvc.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
```

Then run:

```bash
npm install
npm run dev
```

Never commit `.env`, API keys, access tokens, or `google-token.json`.

## Deployment

Merges to `main` run `.github/workflows/deploy-pages.yml`. Production credentials are supplied through GitHub Actions secrets:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The deployment is valid only when the production bundle references `mqmskpdduwbiypepzkvc`.
