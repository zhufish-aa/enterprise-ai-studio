# Controlled static deployment service

Accepts authenticated fixed compiler HTML and content hashes, stages it atomically by deployment UUID, then independently reads and hashes the staged file for health. It does not execute uploaded JavaScript, shell commands, package scripts, or connect to business databases. Production requests require mTLS plus signed, nonce-protected messages. Test HTTP is available only with NODE_ENV=test and explicit DEPLOY_ALLOW_LOCAL=true.

Configure DEPLOY_WORKER_KEY, DEPLOY_ARTIFACT_DIR, DEPLOY_WORKER_PORT and DEPLOY_TLS_CERT/KEY/CA. The platform API uses a separately configured deploymentWorker target. A deployment becomes active only after source/review/mapping checks, production metadata inspection, worker health, and the final transaction that creates runtime grants and updates the slot. This browser static profile is not a general Node application host or a claim of antivirus/SBOM/kernel sandbox certification.
