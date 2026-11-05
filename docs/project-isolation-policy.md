# Qidra project isolation policy

Effective date: 2026-11-05.

This policy is mandatory for every manual, automated and AI-assisted Qidra operation performed on the shared Mac or in connected cloud accounts.

## Allowed scope

Work is limited to resources positively identified as belonging to Qidra and required by the approved Qidra task. For the Google authentication recovery task, the only allowed Google Cloud project is:

- Project name: `Qidra Authentication`
- Project ID: `qidra-authentication`
- Purpose: Qidra Google OAuth only
- Billing: must remain unlinked unless separately approved

Repository changes are limited to the Qidra repository and a dedicated `codex/qidra-*` branch or clean Qidra worktree.

## Prohibited actions

- Do not open, edit, stop, restart, delete, rename or inspect another project's cloud resources.
- Do not use another project's credentials, secrets, domains, databases, buckets, containers or CI/CD configuration.
- Do not change another project's browser tab, active form or one-time secret flow.
- Do not stop another user's process, simulator, container, build or browser session.
- Do not run global cleanup commands such as `docker system prune`, `simctl delete all` or broad cache deletion.
- Do not restore the deleted legacy Google Cloud project `qidra-476219`; restoring it could reactivate unrelated legacy resources and costs.
- Do not attach billing or enable paid Google Cloud services for `qidra-authentication` without separate explicit approval.

## Required verification before an action

1. Confirm the repository, account, project ID, domain and target environment.
2. Stop if the resource cannot be positively attributed to Qidra.
3. Record the intended change and expected impact.
4. Back up production data before a deployment that can affect runtime or stored data.
5. Verify only Qidra health checks and Qidra user journeys after the change.

## Shared Mac safety

- Run `uptime` before heavy work. If the first load average is above `30`, do not start a build, Docker workload or simulator.
- Run only one heavy build at a time on the machine.
- Shut down only Qidra-owned temporary resources after verification.
- Never close Docker Desktop because other projects may depend on it.

## Incident rule

If another project or unidentified resource is opened accidentally, perform no action on it, leave its state unchanged and return to the verified Qidra scope. If an intended Qidra action cannot be completed without touching another project, stop and request a separate decision.
