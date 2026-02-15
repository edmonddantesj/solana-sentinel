# Security Policy (Repo Publishing)

This repo is public. **Never commit secrets**.

## Mandatory before every push

Run:

```bash
./scripts/security_check.sh
```

If it fails, **do not push** until fixed.

## Secret handling rules

- Put credentials only in environment variables (`.env` locally).
- Keep `.env.example` (safe placeholders) in git.
- `.env` must stay untracked (already in `.gitignore`).

## CI guard (GitHub Actions)

A GitHub Actions workflow runs secret scanning on every push/PR.
If it fails, treat it as a release blocker.
