# Vercel deployment checks

The application is a Vite static build deployed from the repository root.

- Production branch: `main`.
- Framework: Vite.
- Install: `npm ci --no-audit --no-fund`.
- Build: `npm run build`.
- Output: `dist`.

These values are also declared in `vercel.json`.

For a homepage 404, open the latest Vercel deployment and verify its source commit matches GitHub main. Confirm its status is Ready and inspect its build log. Test the deployment-specific URL separately from the production domain: a working deployment URL with a failing production domain indicates a domain or production-alias issue. Preserve the error code shown on the error page when reporting a failure.

The production homepage and critical JavaScript, GLB, and Draco WASM resources returned HTTP 200 in local preview validation. This does not verify the remote Vercel deployment. Its status and logs require Vercel account access.

A GitHub push can trigger deployment only when Vercel's Git integration is connected and automatic deployments are enabled. A successful push alone does not establish deployment success.
