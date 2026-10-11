# Veyro Video Bridge (isolated feature branch)

VIDEO gateway is disabled by default; no GPU was started and no production code was deployed.

The authenticated Veyro Worker checks project ownership before proxying `POST/GET /api/projects/:id/video-jobs` to the internal Veyro-Video-Engine Python API. The gateway derives an opaque per-project identity; no browser receives the engine token.

Backend secrets: `VEYRO_VIDEO_ENABLED=true` (only after tests), `VEYRO_VIDEO_BASE_URL` (HTTPS internal endpoint), `VEYRO_VIDEO_INTERNAL_TOKEN` (>=32 chars). Local HTTP loopback allowed only with VEYRO_AUTH_MODE=local. Routes: `/video-jobs`, `/video-jobs/:job_id`, `/video-jobs/:job_id/cancel`, `/video-jobs/:job_id/result`.

Pending for public launch: Cloudflare Access real tests, Cloudflare rate limiter and PR #7 security integration, actual GPU workflow validation, provider-wide spending limits, distributed jobs, object storage R2 instead of proxy-only MP4 transfer, and a mature media transcoding/validation pipeline.

Run Node 24+: `npm ci && npm test && npm run build`. Never merge or publish without explicit authorization.