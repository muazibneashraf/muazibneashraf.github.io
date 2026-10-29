# Project Memory & Sync Guidelines

## Project Context
- **Project Name**: Portfolio Muaz
- **Local Directory**: `D:\Portfolio Muaz`
- **Owner**: Muaz Ibne Ashraf (`muazibneashraf`)
- **GitHub Repository**: `muazibneashraf/muazibneashraf.github.io` (branch: `main`)
- **Vercel Project**: `muazibneashraf`
- **Live Production URL**: `https://muazibneashraf.vercel.app`

## Connected Services & Credentials
- **Git / GitHub**: Fully authenticated using GitHub CLI (`gh`) credential helper over HTTPS. Commits, pushes, fetches, and merges operate seamlessly without passwords.
- **Vercel CLI**: Linked locally to project `muazibneashraf` via `.vercel/` and authenticated under user `muazibneashraf`.

## Sync & Deployment Workflows
1. **GitHub Synchronization**:
   - Run `git add .`, `git commit -m "..."`, and `git push origin main`.
   - GitHub triggers automated CI/CD and informs Vercel.
2. **Vercel Direct Deployment**:
   - Preview deployment: `vercel`
   - Production deployment: `vercel --prod`
3. **Local Development**:
   - Start local dev server: `npm run dev`
   - Build static assets / pages: `npm run build`
