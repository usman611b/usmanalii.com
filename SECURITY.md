# Security Policy

## Supported version

Security fixes are applied to the latest version on the default branch and the production deployment
at `usmanalii.com`.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Report the issue privately to the repository owner through GitHub's private vulnerability reporting
feature. Include:

- the affected route, component, or package;
- the impact and prerequisites;
- minimal reproduction steps;
- any relevant request IDs with secrets and personal data removed;
- a suggested mitigation, if known.

You should receive an acknowledgement within seven days. Disclosure timing will be coordinated after
the issue is reproduced and a safe fix is available.

## Scope

High-priority reports include authentication or authorization bypasses, cross-owner data access,
publication-policy bypasses, secret exposure, unsafe artifact access, stored cross-site scripting,
and abuse of contact or response endpoints.

The following are normally out of scope unless they create material security impact:

- automated scanner output without a reproducible exploit;
- denial-of-service testing against production;
- social engineering or physical attacks;
- reports about software versions without a demonstrated vulnerable path.

## Safe handling

Never include API keys, access tokens, private portfolio records, visitor messages, or unredacted
personal data in reports, logs, screenshots, commits, or issues.
