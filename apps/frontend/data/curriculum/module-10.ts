export const module10Lessons = [
  {
    id: 'lesson-10-01',
    slug: 'production-operations-01-ci-cd-pipeline-design',
    title: 'CI/CD Pipeline Design',
    content: `## 1. Quick Summary

**CI/CD** (Continuous Integration / Continuous Deployment) automates the software delivery lifecycle. **CI** automatically builds and tests code on every commit, catching integration issues early. **CD** automatically deploys validated code to production (or staging) with zero downtime. Modern CI/CD pipelines use tools like **GitHub Actions**, **GitLab CI**, **Jenkins**, **CircleCI**, and **ArgoCD**. Key concepts: **pipeline stages** (lint → build → test → deploy), **gates** (manual approval, test thresholds), **artifact management**, and **rollback strategies**. A well-designed pipeline reduces deployment failures by 80%+ and cuts mean time to deploy from hours to minutes.

## 2. Definition

A **CI/CD pipeline** is a sequence of automated steps that take source code from commit to production deployment. Each step validates the code and passes artifacts to the next stage.

**CI pipeline stages:**
- **Source**: Triggered by git push / pull request.
- **Lint**: Static analysis (ESLint, pylint, Checkstyle).
- **Build**: Compile, bundle, containerize (Docker, Webpack, Maven).
- **Unit Test**: Fast, isolated tests (Jest, pytest, JUnit).
- **Integration Test**: Tests against real dependencies (DB, API).
- **Security Scan**: SAST, dependency scanning (Snyk, SonarQube).
- **Artifact**: Publish to registry (Docker Hub, npm, S3).

**CD pipeline stages:**
- **Deploy to Staging**: Apply to staging environment.
- **Smoke Test**: Quick sanity checks after deployment.
- **E2E Test**: Full browser/mobile tests (Cypress, Playwright).
- **Approval Gate**: Manual or automated go/no-go.
- **Deploy to Production**: Canary / blue-green / rolling.
- **Post-deploy Validation**: Monitor metrics, errors, latency.

## 3. Why It Exists / Problem It Solves

Before CI/CD, teams followed **waterfall releases**: months of development followed by a high-risk "big bang" deployment. Problems:
- **Integration hell**: Developers worked in isolation; merging took weeks.
- **Manual process**: Deployments required runbooks, pager-duty ops engineers.
- **Long feedback loops**: Bugs were found days (or weeks) after introduction.
- **No reproducibility**: "Works on my machine" — environments diverged.
- **Rollback difficulty**: Rolling back was often as risky as rolling forward.

CI/CD solves these by:
- **Automating** every step from commit to deploy.
- **Standardizing** environments (containers, infrastructure-as-code).
- **Shortening** feedback loops (minutes, not days).
- **Enabling** multiple deployments per day with confidence.
- **Providing** audit trail and traceability for every change.

## 4. When to Use It

- **Any production service**: Deploying to production without CI/CD is reckless.
- **Team of 2+ developers**: Coordination requires automated validation.
- **Microservices**: Each service needs its own pipeline.
- **Mobile apps**: CI/CD for build, test, signing, and app store distribution.
- **Infrastructure-as-code**: Terraform, Pulumi, CloudFormation changes need validation.
- **Open source projects**: CI for PR checks, CD for npm/Docker publishing.

## 5. When NOT to Use It / Tradeoffs

- **Prototype / MVP**: Full CI/CD overhead may slow early iteration.
- **One-person project**: Manual deploy might be faster initially.
- **Compliance-heavy environments**: Some regulated industries require manual approval at every stage (air-gapped deployment).
- **Cost**: CI/CD minutes cost money (GitHub Actions, CircleCI credits).
- **Pipeline complexity**: Overly complex pipelines become fragile and slow.
- **Monolithic codebase**: Single pipeline for a monolith can take hours.

## 6. How It Works (Deep Mechanics)

**Pipeline execution model:**

1. **Trigger**: Webhook from git provider (GitHub webhook → CI server).
2. **Orchestration**: CI server picks the pipeline definition (YAML/JSON).
3. **Parallel stages**: Independent jobs run in parallel (lint + build + test).
4. **Artifact passing**: Output from build stage passed to deploy stage (Docker image, JAR, ZIP).
5. **Environment provisioning**: CD tool creates/updates infrastructure (kubectl apply, terraform apply).
6. **Traffic shifting**: Load balancer gradually shifts traffic to new version.
7. **Health checks**: Pipeline monitors error rate, latency, CPU after deploy.
8. **Rollback on failure**: If health checks fail, pipeline triggers rollback.

**Trunk-based development vs GitFlow:**
- **Trunk-based**: Short-lived branches, merge to main multiple times/day. CI runs on every push. Preferred for CI/CD.
- **GitFlow**: Long-lived feature branches, release branches, hotfix branches. CI/CD adds complexity.

**Deployment strategies (in pipeline):**
- **Recreate**: Stop old version, deploy new version. Simple but has downtime.
- **Rolling**: Gradually replace instances. Supports zero-downtime.
- **Blue-Green**: Two identical environments; switch traffic at once.
- **Canary**: Route small % of traffic to new version, monitor, ramp up.
- **Feature flags**: Deploy code behind flag; activate when ready.

## 7. Architecture Diagram (ASCII)

\`\`\`
                    CI Pipeline                       CD Pipeline
                    ────────────                      ────────────

  Git Push ──► Webhook ──► Lint ──► Build ──► Unit Test
                │                                          │
                │                                    Integration Test
                │                                          │
                │                                    Security Scan
                │                                          │
                │                                   Publish Artifact
                │                                          │
                ▼                                          ▼
          ┌─────────────────────────────────────────────────────┐
          │               Artifact Registry (Docker Hub, S3)    │
          └─────────────────────────────────────────────────────┘
                                                          │
                                                          ▼
                                          ┌─────────────────────┐
                                          │  Deploy to Staging  │
                                          └─────────┬───────────┘
                                                    │
                                                    ▼
                                          ┌─────────────────────┐
                                          │  Smoke / E2E Tests  │
                                          └─────────┬───────────┘
                                                    │
                                          ┌─────────────────────┐
                                          │  Approval Gate      │
                                          └─────────┬───────────┘
                                                    │
                                          ┌─────────────────────┐
                                          │ Deploy to Production│
                                          │ (Canary / Blue-Green)│
                                          └─────────┬───────────┘
                                                    │
                                                    ▼
                                          ┌─────────────────────┐
                                          │ Post-deploy Monitor │
                                          │ (Metrics, Logs,     │
                                          │  Alerts, Error      │
                                          │  Budget)            │
                                          └─────────────────────┘
\`\`\`

## 8. Real-World Examples / Case Studies

**Netflix**: Spinnaker-based CD pipeline deploys thousands of times daily. Each deploy goes through: bake (AMI creation) → test → canary → global deploy. If error rate spikes, Spinnaker auto-rolls back.

**Google**: Trunk-based development with CI enforced at scale. All changes reviewed and tested before submission to main. Deployment via SRE-run pipeline with gradual rollout across regions.

**Etsy**: Pioneered "deploy anytime" culture. Continuous deployment pipeline with feature flags. Over 50 deployments per day with <0.01% failure rate.

## 9. Failure Scenarios & Mitigations

- **Flaky tests**: Tests that intermittently fail erode trust. Mitigation: quarantine flaky tests, fix or remove them.
- **Long pipelines**: Pipeline takes hours, slowing developer velocity. Mitigation: parallelize stages, optimize build cache.
- **Secret leakage**: Credentials exposed in pipeline logs. Mitigation: use secrets management (Vault, GitHub Secrets), scan logs for secrets.
- **Artifact corruption**: Bad build artifact deployed to production. Mitigation: checksum verification, immutable artifacts.
- **Deployment drift**: Environment state diverges from IaC definition. Mitigation: drift detection in pipeline, periodic reconciliation.
- **Approval gate bottlenecks**: Manual approval blocks deploys for hours. Mitigation: automated gating with error budget policy.

## 10. Interview Drills / Common Questions

- **Q**: "Design a CI/CD pipeline for a microservices architecture."
  - **A**: Each service gets its own pipeline; shared library for common stages; orchestration with ArgoCD; canary deploy per service; feature flags for coordination.

- **Q**: "How do you handle database migrations in a CI/CD pipeline?"
  - **A**: Schema migrations are forward-only (no destructive changes); run migrations before app deploy; have backward-compatible schema for rollback.

- **Q**: "What's the difference between continuous delivery and continuous deployment?"
  - **A**: Continuous delivery means every change is deployable (but deploy may be manual). Continuous deployment automatically deploys every change to production.

- **Q**: "How do you ensure zero-downtime deployments?"
  - **A**: Blue-green or rolling deployment with readiness probes; database backward compatibility; graceful shutdown handling.

## 11. Key Takeaways

- CI/CD automates build, test, and deploy — enabling frequent, low-risk releases.
- **Pipeline as code** (YAML) ensures reproducibility and version control.
- **Shift left** — test earlier in the pipeline to catch bugs faster.
- **Deployment strategies** (canary, blue-green, rolling) enable zero-downtime releases.
- **Post-deploy monitoring** closes the loop — detect and rollback bad changes quickly.
- **Trunk-based development** supports CI/CD best; GitFlow adds friction.

## 12. References / Further Reading

- **"Continuous Delivery"** by Jez Humble and David Farley (the foundational book).
- **"The DevOps Handbook"** by Gene Kim et al.
- **GitHub Actions Documentation**: https://docs.github.com/en/actions
- **ArgoCD Documentation**: https://argo-cd.readthedocs.io/
- **"Trunk-Based Development"**: https://trunkbaseddevelopment.com/
- **Martin Fowler on CI/CD**: https://martinfowler.com/articles/continuousIntegration.html`,
    estimatedMin: 18,
    difficulty: 'Intermediate',
    companies: ['Netflix', 'Google', 'Etsy'],
    tags: ['CI/CD', 'Pipeline', 'DevOps', 'Automation'],
  },
  {
    id: 'lesson-10-02',
    slug: 'production-operations-02-monitoring-observability',
    title: 'Monitoring & Observability',
    content: `## 1. Quick Summary

**Monitoring** collects and visualizes metrics from production systems (CPU, latency, error rate). **Observability** goes deeper — it lets you ask arbitrary questions about system state using logs, metrics, and traces (the **three pillars**). Modern observability stacks include **Prometheus** (metrics), **Grafana** (dashboards), **ELK/Loki** (logs), and **Jaeger/Zipkin** (traces). **Alerting** (with Alertmanager, PagerDuty) notifies engineers when things break. The key metric frameworks are **USE** (Utilization, Saturation, Errors) for infrastructure and **RED** (Rate, Errors, Duration) for services. At Netflix scale, engineers use observability to debug 1000+ microservices with confidence.

## 2. Definition

**Monitoring** is the process of collecting, aggregating, and analyzing metrics to track system health. It answers known unknowns — "Is the database latency > 100ms?"

**Observability** is a property of a system that measures how well you can understand its internal state from external outputs. It answers unknown unknowns — "Why is this specific user request failing when 99.9% succeed?"

**Three pillars of observability:**
1. **Metrics**: Numeric measurements at points in time (counters, gauges, histograms).
2. **Logs**: Structured or unstructured records of discrete events.
3. **Traces**: Records of a request path through distributed services (spans).

**Key metrics:**
- **Latency**: Time to serve a request (p50, p95, p99, p999).
- **Traffic**: Request rate (RPS, QPS, TPS).
- **Errors**: Error rate (5xx, 4xx, exceptions, timeouts).
- **Saturation**: How full a resource is (CPU, memory, disk, connections).

## 3. Why It Exists / Problem It Solves

Without monitoring and observability, production is a black box:
- Outages are detected by users (not engineers).
- Root cause analysis takes hours or days.
- Slow performance degrades user experience silently.
- Capacity planning is guesswork.
- Blameless postmortems lack data.

Observability solves:
- **Rapid detection**: Alert when error rate spikes or latency increases.
- **Rapid diagnosis**: Traces show which service failed. Logs show error context.
- **Performance optimization**: Metrics show which endpoints are slowest.
- **Capacity planning**: Trends show when you will run out of resources.
- **SLA reporting**: Prove uptime and performance to customers.

## 4. When to Use It

- **Any production system**: Monitoring is table stakes.
- **Microservices**: Observability is essential when a request traverses 10+ services.
- **High-scale systems**: Debugging without observability is impossible at scale.
- **Regulated industries**: Audit trails require logging and monitoring.
- **SLA-bound services**: Need monitoring to track and prove compliance.
- **Incident-driven teams**: Observability reduces MTTR.

## 5. When NOT to Use It / Tradeoffs

- **Over-instrumentation**: Too many metrics increase cost and noise.
- **Alert fatigue**: Too many alerts desensitize engineers.
- **Storage cost**: Logs and traces are expensive at high volume.
- **Complexity**: Setting up Prometheus + Grafana + Loki + Tempo is non-trivial.
- **Sampling tradeoffs**: Tracing every request is expensive; sampling loses data.
- **False positives**: Poorly tuned alerts fire for non-issues.

## 6. How It Works (Deep Mechanics)

**Metrics pipeline:**

1. **Instrumentation**: Application exposes /metrics endpoint with Prometheus client libraries.
2. **Scraping**: Prometheus server scrapes targets on a schedule (every 15s).
3. **Storage**: Prometheus stores time-series data locally (TSDB).
4. **Querying**: PromQL queries aggregate metrics (rate(http_requests_total[5m])).
5. **Visualization**: Grafana queries Prometheus for dashboards.
6. **Alerting**: Alertmanager evaluates rules, deduplicates, routes to PagerDuty.

**Distributed tracing:**

1. **Context propagation**: Request carries trace ID in HTTP headers.
2. **Span creation**: Each service creates a span (name, duration, tags).
3. **Parent-child**: Spans link by trace ID and span ID into a tree.
4. **Collection**: Jaeger agent collects and batches spans.
5. **Storage**: Spans stored in Cassandra or Elasticsearch.
6. **Querying**: Jaeger UI shows trace waterfall and latency breakdown.

**Log aggregation:**

1. **Structured logging**: Applications emit JSON logs.
2. **Shipping**: Fluentd or Promtail tails log files to central store.
3. **Indexing**: Elasticsearch or Loki indexes logs for search.
4. **Querying**: Kibana or Grafana Explore for log visualization.

## 7. Architecture Diagram (ASCII)

\`\`\`
                        ┌──────────────────────┐
                        │   Application Pod     │
                        │  ┌──────────────────┐ │
                        │  │ /metrics endpoint│ │
                        │  │ (Prometheus lib) │ │
                        │  ├──────────────────┤ │
                        │  │ Structured logs  │ │
                        │  ├──────────────────┤ │
                        │  │ Trace export     │ │
                        │  └──────────────────┘ │
                        └──────┬───────────────┬─┘
                               │               │
                 ┌─────────────▼──┐    ┌───────▼────────┐
                 │  Prometheus    │    │   Fluentd       │
                 │  (scrape 15s)  │    │   (log shipper) │
                 └───────┬───────┘    └───────┬────────┘
                         │                    │
                 ┌───────▼───────┐    ┌───────▼──────────┐
                 │  Alertmanager │    │  Loki / Elastic  │
                 └───────┬───────┘    └───────┬──────────┘
                         │                    │
                         ▼                    │
                 ┌──────────────┐            │
                 │  PagerDuty   │            │
                 │  / Slack     │            │
                 └──────────────┘            │
                                             ▼
                ┌────────────────────────────────────┐
                │        Grafana Dashboards          │
                │  (Metrics: PromQL / Logs: LogQL    │
                │   / Traces: Jaeger data source)    │
                └────────────────────────────────────┘
\`\`\`

## 8. Real-World Examples / Case Studies

**Google**: Monarch and Dapper monitor every service. SRE teams define SLOs and error budgets. Alerts based on burn rate, not static thresholds.

**Uber**: Built observability on OpenTelemetry + Cortex. Processes 50TB of traces daily. RED metrics for every microservice.

**Netflix**: Atlas (metrics), ELK (logs), custom distributed tracing. Automated canary analysis compares metrics to baseline.

## 9. Failure Scenarios & Mitigations

- **Prometheus overload**: High cardinality metrics crash it. Mitigation: limit label cardinality, use recording rules.
- **Log loss**: Shipper dies, logs lost. Mitigation: buffer locally, use persistent queue.
- **Trace sampling bias**: Sampling misses rare errors. Mitigation: tail-based sampling with error prioritization.
- **Alert fatigue**: Hundreds of alerts daily. Mitigation: tune thresholds, aggregate alerts.
- **Dashboard clutter**: Too many graphs, no insights. Mitigation: follow golden signals (RED/USE).

## 10. Interview Drills / Common Questions

- **Q**: "Design a monitoring system for 1000 microservices."
  - **A**: Prometheus + Thanos for long-term storage; service-level dashboards; RED metrics; distributed tracing with sampling; structured logging with correlation IDs.

- **Q**: "What is the difference between monitoring and observability?"
  - **A**: Monitoring tells you what is broken (known knowns). Observability lets you debug unknown problems (unknown unknowns) by exploring system data.

- **Q**: "How do you handle high-cardinality metrics?"
  - **A**: Limit label values; use log-based metrics for high cardinality; use recording rules to aggregate.

## 11. Key Takeaways

- **Three pillars**: Metrics, logs, traces — each serves a different purpose.
- **RED for services**: Rate, Errors, Duration (application-centric).
- **USE for resources**: Utilization, Saturation, Errors (infrastructure-centric).
- **Alert on symptoms**: High error rate, not high CPU (unless causing errors).
- **Start simple**: Prometheus + Grafana + structured logging covers 80% of needs.

## 12. References / Further Reading

- **"Site Reliability Engineering"** by Beyer, Jones, Petoff, Murphy.
- **Prometheus Documentation**: https://prometheus.io/docs/
- **OpenTelemetry Documentation**: https://opentelemetry.io/docs/
- **USE Method (Brendan Gregg)**: https://www.brendangregg.com/usemethod.html`,
    estimatedMin: 20,
    difficulty: 'Intermediate',
    companies: ['Google', 'Netflix', 'Uber'],
    tags: ['Monitoring', 'Observability', 'Prometheus', 'Grafana', 'Tracing'],
  },
  {
    id: 'lesson-10-03',
    slug: 'production-operations-03-incident-response',
    title: 'Incident Response',
    content: `## 1. Quick Summary

**Incident response** is the structured process of detecting, managing, and resolving production incidents. A mature program includes: **severity classification** (SEV1–SEV5), **on-call rotations**, **escalation paths**, **runbooks**, **incident commanders**, and **blameless postmortems**. Goals: minimize **MTTD** (Mean Time to Detect) and **MTTR** (Mean Time to Resolve). Companies use **PagerDuty**, **OpsGenie**, and **Incident.io** for incident management. A well-run process can reduce MTTR from hours to minutes.

## 2. Definition

**Incident** = any event causing (or potentially causing) degradation or outage of a production service.

**Severity levels:**
- **SEV1**: Critical outage affecting all users. Immediate response. Major revenue impact.
- **SEV2**: Partial outage or degraded experience for many users. Urgent response.
- **SEV3**: Minor degradation affecting a subset of users. Respond within business hours.
- **SEV4**: Non-urgent bug or cosmetic issue. Fix in regular sprint.
- **SEV5**: Informational. No action needed.

**Key roles during an incident:**
- **Incident Commander (IC)**: Owns the incident end-to-end. Coordinates response, manages communication.
- **Scribe**: Takes notes, timestamps actions, documents timeline.
- **SME**: Engineers debugging the issue.
- **Communication Lead**: Updates stakeholders, status page, support.

**Incident lifecycle:**
1. **Detection**: Alert fires or user reports issue.
2. **Triage**: Determine severity, declare incident, page responders.
3. **Mitigation**: Stop the bleeding (rollback, feature flag, scale up).
4. **Resolution**: Apply permanent fix.
5. **Follow-up**: Postmortem, action items, monitoring improvements.

## 3. Why It Exists / Problem It Solves

Without structured incident response:
- **Chaos**: Everyone jumps in, no coordination, conflicting actions.
- **Slow detection**: Engineers learn about outages from Twitter.
- **No communication**: Stakeholders left in the dark.
- **No documentation**: Post-incident, no one knows what happened.
- **Repeat incidents**: Same root cause causes multiple outages.
- **Burnout**: Unstructured on-call leads to engineer exhaustion.

## 4. When to Use It

- **Any production outage**: Declare when user-facing impact occurs.
- **Security breach**: Follow security incident response process.
- **Data loss or corruption**: Immediate incident declaration.
- **Missed SLO**: Repeated violations trigger incident review.
- **New service launch**: Plan ready before going live.

## 5. When NOT to Use It / Tradeoffs

- **Over-declaring**: Declaring incidents for minor issues causes alert fatigue.
- **Process overhead**: Too much bureaucracy slows response.
- **On-call burden**: 24/7 on-call without rotation leads to burnout.
- **Slack coordination**: Using chat for incident response adds noise.

## 6. How It Works (Deep Mechanics)

**On-call rotation design:**
1. **Primary** (first line): Responds within 5 minutes.
2. **Secondary** (escalation): Responds if primary does not acknowledge.
3. **Tertiary** (manager): Escalated after 10 minutes.
4. **Follow-the-sun**: Global teams hand off across timezones.

**Incident response flow:**

1. Alert fires → PagerDuty pages primary.
2. Primary acknowledges → Opens incident in management tool.
3. Triage (first 5 min): Determine severity, declare if SEV1/SEV2.
4. IC takes over → Sets up channel, assigns scribe, sends comms.
5. SMEs investigate → Check dashboards, traces, logs.
6. Mitigation → Apply hotfix, rollback, scale, redirect traffic.
7. Verification → Confirm resolution via monitoring.
8. Resolution → Close incident, schedule postmortem.

**Communication cadence:**
- SEV1: Update every 15-30 minutes.
- SEV2: Update every 60 minutes.
- Status page updates for customer-facing incidents.

## 7. Architecture Diagram (ASCII)

\`\`\`
Incident Response Flow

   Alert / Report
        │
        ▼
   ┌──────────────┐
   │  Primary      │  (5 min to ACK)
   │  On-Call      │
   └──────┬───────┘
          │
          ├── ACK? ──► Triage (5 min)
          │                │
          │                ├── Obvious fix? ──► Mitigate
          │                │
          │                └── Complex? ──► Declare Incident
          │                                    │
          └── No ACK? ──► Secondary            │
                               │               ▼
                          Tertiary     ┌─────────────────┐
                                       │  IC Assigned    │
                                       │  Scribe Assigned│
                                       │  Channel Created│
                                       └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │  Investigation   │
                                       │  & Mitigation    │
                                       └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │  Incident Fixed  │
                                       │  Verify via      │
                                       │  Monitoring      │
                                       └────────┬────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │  Postmortem      │
                                       │  (within 48h)    │
                                       │  Blameless       │
                                       │  Action Items    │
                                       └─────────────────┘
\`\`\`

## 8. Real-World Examples / Case Studies

**Google SRE**: Role-based response (IC, SME, comms). Postmortems are blameless with tracked action items.

**GitHub "Hammer" incident (2020)**: DNS outage caused by load balancer config change. Led to deployment gating.

**Amazon COE (Correction of Errors)**: Every significant incident requires a COE document with timeline, 5 whys, and action items. Reviewed by executives weekly.

## 9. Failure Scenarios & Mitigations

- **First responder burnout**: Too many pages. Mitigation: tune alerts, add secondary tier.
- **Communication silos**: IC does not know what SMEs found. Mitigation: regular check-ins.
- **Escalation failure**: Nobody responds. Mitigation: auto escalation chain, phone calls.
- **Fix causes worse issue**: Mitigation causes new outage. Mitigation: test in staging first.
- **Postmortem never happens**: Team too busy. Mitigation: schedule within 48h, management enforces.

## 10. Interview Drills / Common Questions

- **Q**: "You are on-call and get paged at 2AM. What do you do?"
  - **A**: Acknowledge within 5 min. Determine severity. If SEV1/SEV2, declare incident. Rollback if recent deploy. Check dashboards. Communicate status.

- **Q**: "Design an on-call rotation for a team of 5."
  - **A**: Primary + secondary rotation. Each person is primary for 1 week, secondary the next. Follow-the-sun if global.

- **Q**: "What makes a good postmortem?"
  - **A**: Blameless, focuses on systemic failures. Includes timeline, root cause, 5 whys, action items with owners. No blame assigned.

## 11. Key Takeaways

- **Structured response** reduces chaos and MTTR.
- **Severity classification** drives appropriate response.
- **On-call rotations** must be sustainable (follow-the-sun, secondary tier).
- **IC delegates** debugging to SMEs.
- **Blameless postmortems** focus on systems, not people.
- **Action items** must be tracked to completion.

## 12. References / Further Reading

- **"Incident Management"** (Google SRE Book, Chapter 13).
- **"The Site Reliability Workbook"** by Google.
- **PagerDuty Incident Response**: https://response.pagerduty.com/
- **Atlassian Postmortems**: https://www.atlassian.com/incident-management/postmortem`,
    estimatedMin: 15,
    difficulty: 'Intermediate',
    companies: ['Google', 'Amazon', 'GitHub'],
    tags: ['Incident Response', 'On-Call', 'Postmortem', 'SRE'],
  },
  {
    id: 'lesson-10-04',
    slug: 'production-operations-04-database-backups-dr',
    title: 'Database Backups & Disaster Recovery',
    content: `## 1. Quick Summary

**Database backups** and **disaster recovery (DR)** ensure data survives hardware failures, software bugs, human errors, and regional outages. Key concepts: **RPO** (Recovery Point Objective — max data loss), **RTO** (Recovery Time Objective — max downtime), **backup types** (full, incremental, differential, snapshot), and **DR strategies** (pilot light, warm standby, active-active). Modern systems combine **automated backups**, **point-in-time recovery (PITR)**, and **cross-region replication**. At scale, GitHub and Stripe achieve RPO < 1 minute and RTO < 1 hour.

## 2. Definition

**RPO**: Maximum acceptable data loss in time. Drives backup frequency.
**RTO**: Maximum acceptable downtime. Drives DR infrastructure investment.

**Backup types:**
- **Full backup**: Complete database copy. Simple restore but slow to create.
- **Incremental backup**: Only data changed since last backup. Fast but complex restore.
- **Snapshot**: Point-in-time image of storage volume. Near-instant but same failure domain.
- **Physical backup**: Database file copy at OS level (pg_basebackup, XtraBackup).
- **Logical backup**: SQL dump (pg_dump, mysqldump). Flexible but slower.

**DR strategies:**
1. **Backup & Restore**: Off-site backups. Restore to new region. RTO: hours, RPO: hours.
2. **Pilot Light**: Minimal replica in DR region. Scale up on failover. RTO: minutes.
3. **Warm Standby**: Scaled replica ready to serve. RTO: seconds.
4. **Active-Active**: Both regions serve traffic. Failover is instant. RTO: zero.

## 3. Why It Exists / Problem It Solves

Data loss scenarios:
- **Hardware failure**: Disk crash, power supply failure.
- **Software bug**: Buggy migration deletes data.
- **Human error**: Accidental DROP TABLE or DELETE without WHERE.
- **Ransomware**: Attacker encrypts database.
- **Regional outage**: Cloud provider region goes down.

## 4. When to Use It

- **Any production database**: Backups are non-negotiable.
- **Regulated data**: HIPAA, PCI-DSS, SOC 2 require backup and DR testing.
- **Multi-region services**: Active-active for global users.
- **SaaS products**: Customer data loss destroys trust.
- **Financial systems**: Every transaction must be recoverable.

## 5. When NOT to Use It / Tradeoffs

- **Cost**: Cross-region replication doubles infrastructure cost.
- **Complexity**: DR failover testing requires orchestration.
- **Performance impact**: Frequent backups affect production DB.
- **Storage cost**: Backups accumulate. Manage lifecycle.
- **False security**: Untested backups are useless. Test restore regularly.

## 6. How It Works (Deep Mechanics)

**PostgreSQL WAL-based PITR:**

1. Enable WAL archiving (archive_mode, archive_command).
2. Take base backup (pg_basebackup) → copy to S3.
3. Continuously archive WAL segments to S3.
4. Restore: base backup + replay WAL to desired point.
5. PITR: stop replay at specific timestamp or transaction ID.

**Automated backup pipeline:**
\`\`\`
Daily full        ──► S3 (lifecycle: 30 days)
Hourly incremental ──► S3 (lifecycle: 7 days)
WAL streaming      ──► S3 (lifecycle: 24h, PITR window)
Cross-region copy  ──► S3 in DR region
\`\`\`

**DR testing:**
- **Tabletop exercise**: Walk through DR plan without touching production.
- **Restore test**: Restore backup to staging. Verify data integrity.
- **Chaos experiment**: Simulate region failure, automate failover.
- **Game day**: Full-scale DR drill with on-call engineers.

## 7. Architecture Diagram (ASCII)

\`\`\`
Active Region (us-east-1)          DR Region (us-west-2)

┌─────────────────────┐            ┌─────────────────────┐
│  Primary DB         │            │  Read Replica        │
│  (PostgreSQL RDS)   │──────────►│  (async replication) │
│                     │  WAL       │                      │
│  ┌───────────────┐  │  stream    │  ┌────────────────┐  │
│  │ Daily Snapshot│  │            │  │  Warm Standby  │  │
│  └───────┬───────┘  │            │  └────────────────┘  │
└──────────┼──────────┘            └──────────────────────┘
           │                                 ▲
           ▼                                 │
┌──────────────────────┐                    │
│  S3 Backup Bucket    │────────────────────┘
│  ├── Full (daily)    │  Cross-region replication
│  ├── WAL (streaming) │
│  ├── PITR logs       │
│  └── Retention rules │
└──────────────────────┘
\`\`\`

## 8. Real-World Examples / Case Studies

**GitHub (MySQL)**: Automated backups with PITR. Cross-region replication. DR tested quarterly with full failover exercises.

**Stripe (PostgreSQL)**: Multi-region active-active. WAL replication with auto failover. RPO < 1 second, RTO < 30 seconds.

**Netflix (Cassandra)**: Multi-region active-active. Backups to S3 with corruption detection. Chaos Gorilla tests region failures.

## 9. Failure Scenarios & Mitigations

- **Corrupted backup**: Backup completes but data corrupt. Mitigation: checksum verification, regular restore testing.
- **Slow restore**: TB-scale restore takes too long. Mitigation: faster storage, parallel restore.
- **Orphaned write after failover**: Inconsistent data. Mitigation: ensure WAL consistency, use semi-sync replication.
- **Ransomware deletes backups**: Attacker deletes backups. Mitigation: immutable WORM storage, air-gapped backups.

## 10. Interview Drills / Common Questions

- **Q**: "Design a backup strategy for a 2TB PostgreSQL database."
  - **A**: Daily full to S3 (30 day retention). Continuous WAL archiving for PITR (24h). Cross-region replication. Weekly restore test. RPO: 1 min, RTO: 2 hours.

- **Q**: "How do you test disaster recovery?"
  - **A**: Automated restore test weekly. Full DR drill quarterly. Chaos monkey for region failure.

- **Q**: "Physical vs logical backups — when to use each?"
  - **A**: Physical for fast backup/restore of large DBs. Logical for smaller DBs, selective restore, schema-only.

## 11. Key Takeaways

- **Backups are not optional** — every production DB must be backed up.
- **RPO drives frequency**, RTO drives infrastructure investment.
- **Test your backups** — untested backups are worthless.
- **PITR** enables recovery to any point in time.
- **DR strategies** range from backup-restore (cheap) to active-active (expensive).
- **Automate everything** — manual procedures fail when needed most.

## 12. References / Further Reading

- **PostgreSQL Backup and Restore**: https://www.postgresql.org/docs/current/backup.html
- **AWS Backup Documentation**: https://aws.amazon.com/backup/
- **"Disaster Recovery on AWS"**: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/`,
    estimatedMin: 18,
    difficulty: 'Intermediate',
    companies: ['Stripe', 'GitHub', 'Netflix'],
    tags: ['Backups', 'Disaster Recovery', 'RPO', 'RTO', 'PITR'],
  },
  {
    id: 'lesson-10-05',
    slug: 'production-operations-05-blue-green-canary',
    title: 'Blue-Green & Canary Deployments',
    content: `## 1. Quick Summary

**Blue-green** and **canary deployments** are zero-downtime strategies that minimize release risk. **Blue-green** maintains two identical environments (blue = current, green = new). Traffic switches instantly. Rollback is instant (switch back). **Canary** gradually shifts traffic: 1% → 5% → 25% → 100%, monitoring error rates and latency at each step. If metrics degrade, auto-rollback. Essential for 99.99%+ uptime targets.

## 2. Definition

**Blue-Green:**
- Blue: current production (serving all traffic).
- Green: new version deployed (idle, not serving).
- Switch: load balancer routes traffic to green.
- Rollback: switch back to blue instantly.

**Canary:**
- Baseline: stable version serving most traffic.
- Canary: new version receives small traffic %.
- Ramp: gradually increase if metrics healthy.
- Rollback: route all traffic back to baseline.

**Other strategies:** rolling update (Kubernetes default), recreate (has downtime).

## 3. Why It Exists / Problem It Solves

Traditional deployments have issues:
- **Slow rollback**: Reverting rolling updates takes time.
- **No isolation**: New version runs alongside old.
- **Poor observability**: Hard to detect issues quickly.
- **User impact**: All users affected by bad release.

Blue-green solves: instant rollback, isolation, full production traffic test.
Canary solves: gradual exposure, metrics-based gating, A/B comparison.

## 4. When to Use It

| Strategy | Best For |
|----------|----------|
| **Blue-Green** | Major upgrades, schema changes, infrequent deploys |
| **Canary** | Frequent deploys, microservices, gradual risk reduction |
| **Combined** | Deploy to green, then canary traffic = best of both |

## 5. When NOT to Use It / Tradeoffs

**Blue-Green:** 2x infrastructure cost. DB schema must be backward-compatible. Green needs warm-up.
**Canary:** Routing complexity. Metric latency delays ramp. Long deployment time. Stateful services complicate routing.

## 6. How It Works (Deep Mechanics)

**Blue-Green with load balancer:**
1. Deploy new version to green.
2. Run smoke tests against green.
3. Switch traffic: update load balancer target.
4. Bake period: monitor for 10-30 minutes.
5. If healthy, tear down old blue. If not, switch back.

**Canary ramp phases:**
- Phase 1 (1%): Verify no crash.
- Phase 2 (5%): Check p95 latency, error rate.
- Phase 3 (25%): Verify at scale.
- Phase 4 (100%): Full rollout if metrics pass.

**Auto-rollback conditions:** error rate +0.5%, p99 latency +20%, 5xx threshold exceeded.

## 7. Architecture Diagram (ASCII)

\`\`\`
Blue-Green:

   ┌──────────────────────┐
   │  Load Balancer       │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────┐    ┌──────────────┐
   │   Blue (v1)  │    │  Green (v2)  │
   │  Current     │    │  New (idle)  │
   │  Serving     │    │  Ready       │
   │  traffic     │    │  to switch   │
   └──────────────┘    └──────────────┘

Canary:

   ┌──────────────────────┐
   │  Service Mesh        │
   └──────┬───────────────┘
          │
    ┌─────┴──────┐
    │            │
    ▼            ▼
┌──────────┐ ┌──────────┐
│ Baseline │ │ Canary   │
│ (v1)     │ │ (v2)     │
│ 95%      │ │ 5%       │
└──────────┘ └──────────┘
                │
     ┌──────────┴────────────┐
     │  Metrics Analysis     │
     │  ──────────────────   │
     │  • Error rate OK?     │
     │  • Latency OK?        │
     │  • CPU/Mem OK?        │
     └──────────┬────────────┘
                │
     ┌──────────┴────────────┐
     │  Decision:            │
     │  • Ramp canary (25%)  │
     │  • Rollback (if bad)  │
     │  • Promote (if good)  │
     └───────────────────────┘
\`\`\`

## 8. Real-World Examples / Case Studies

**Netflix (Spinnaker)**: Blue-green with automatic canary analysis. Compares metrics between baseline and canary. Auto-rollback on deviation. Thousands of deploys daily.

**LinkedIn**: Feature flags + canary deploy for every change. Canary by user ID hash for consistency. Four phases with automated gating.

**Etsy (Deployinator)**: Blue-green deploy with smoke tester validating new version before traffic switch. 50+ deploys/day with 99.99% reliability.

## 9. Failure Scenarios & Mitigations

- **Schema incompatibility**: New version writes incompatible data. Mitigation: forward-compatible schema.
- **Connection drain**: In-flight requests lost on switch. Mitigation: graceful shutdown, drain connections.
- **Sticky sessions**: User stuck on old version. Mitigation: session replication across versions.
- **Monitoring lag**: Canary causes damage before detection. Mitigation: real-time metrics.

## 10. Interview Drills / Common Questions

- **Q**: "Design zero-downtime deployment."
  - **A**: Blue-green with load balancer switch. Backward-compatible DB schema. Warm green before switch. Bake period. Instant rollback to blue.

- **Q**: "Canary vs blue-green — when to choose which?"
  - **A**: Canary for high deploy frequency, lower risk tolerance, granular control. Blue-green for infrequent major upgrades, when full environment separation is feasible.

- **Q**: "How to rollback a blue-green deploy?"
  - **A**: Switch load balancer back to blue. Blue still running with old version. Instant.

## 11. Key Takeaways

- **Blue-green**: Instant switch + rollback. Requires 2x infrastructure.
- **Canary**: Gradual rollout + automated gating. Requires granular routing.
- **DB schema must be backward-compatible** for zero-downtime.
- **Monitor during deploy**: auto-rollback on metric degradation.
- **Test rollback** as often as rollout.

## 12. References / Further Reading

- **Martin Fowler — Blue-Green Deployment**: https://martinfowler.com/bliki/BlueGreenDeployment.html
- **Martin Fowler — Canary Release**: https://martinfowler.com/bliki/CanaryRelease.html
- **Spinnaker Documentation**: https://spinnaker.io/docs/
- **Istio Canary Deployments**: https://istio.io/latest/docs/tasks/traffic-management/canary/`,
    estimatedMin: 15,
    difficulty: 'Intermediate',
    companies: ['Netflix', 'LinkedIn', 'Etsy'],
    tags: ['Blue-Green', 'Canary', 'Deployment', 'Zero-Downtime'],
  },
  {
    id: 'lesson-10-06',
    slug: 'production-operations-06-chaos-engineering',
    title: 'Chaos Engineering',
    content: `## 1. Quick Summary

**Chaos engineering** deliberately injects failures into production to uncover weaknesses before they cause customer-impacting outages. Pioneered by **Netflix** with **Chaos Monkey**, it follows a disciplined process: define **steady state**, form a **hypothesis**, run **experiments**, and **automate**. Tools: Chaos Monkey, **Gremlin**, **Litmus**, **Chaos Mesh**, **AWS FIS**. Builds system resilience and engineering confidence.

## 2. Definition

**Chaos Engineering** = experimenting on a system to build confidence in its capability to withstand turbulent conditions in production (Principles of Chaos Engineering).

**Key principles:**
1. Define steady state (normal behavior).
2. Hypothesize the system will remain in steady state.
3. Introduce variables (inject failure).
4. Verify by comparing steady vs experimental state.
5. Automate continuously to prevent regression.

**Experiment types:**
- **Infrastructure**: Kill instances, terminate pods, crash processes.
- **Network**: Packet loss, latency, DNS failure, partition.
- **State**: Corrupt data, kill DB connection, expire cache.
- **Dependency**: Downstream API timeout, auth service down.
- **Resource**: CPU spike, memory leak, disk full, OOM kill.

## 3. Why It Exists / Problem It Solves

Traditional testing cannot catch:
- **Unknown unknowns**: Failures not anticipated.
- **Emergent behavior**: Microservice interactions only visible in production.
- **Configuration drift**: Staging diverges from production.
- **Cascading failures**: One failure triggers a chain reaction.

Chaos engineering solves: resilience validation, incident prevention, deployment confidence, on-call training.

## 4. When to Use It

- **Production systems** for most value.
- **Before major releases** to validate resilience.
- **After architecture changes** (migrations, sharding).
- **High availability targets** (99.99%+).
- **Microservices** with complex service mesh.

## 5. When NOT to Use It / Tradeoffs

- **No monitoring**: Chaos without observability is blind.
- **No rollback**: Every experiment needs blast radius limits.
- **Compliance constraints**: Regulated environments may restrict production experiments.
- **Immature team**: Start with staging first.
- **Experiment fatigue**: Too many = alert fatigue.

## 6. How It Works (Deep Mechanics)

**Experiment lifecycle:**
1. Select hypothesis (e.g., "Killing one pod does not increase error rate above 0.1%").
2. Define steady state (error rate < 0.1%, p99 < 200ms).
3. Design experiment (kill one pod, run 5 minutes).
4. Set blast radius (one namespace, one region).
5. Run experiment via chaos tool.
6. Monitor metrics during experiment.
7. Auto-rollback if error rate spikes.
8. Analyze steady vs experimental state.
9. Automate if findings were significant.

**Chaos Monkey logic:**
\`\`\`
pick random instance from ASG
if business hours and random() < probability:
    terminate instance
\`\`\`

## 7. Architecture Diagram (ASCII)

\`\`\`
Chaos Engineering Platform:

   ┌─────────────────────────────────────┐
   │           Control Plane             │
   │  ┌──────────┐  ┌──────────┐        │
   │  │ Scheduler│  │ Scenario  │        │
   │  │ (cron)   │  │ (YAML)   │        │
   │  └──────────┘  └──────────┘        │
   │  ┌──────────┐                     │
   │  │ Analysis │                     │
   │  │ (metrics)│                     │
   │  └──────────┘                     │
   └──────────────┬─────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │          Execution Plane            │
   │  ┌─────────────────────────────┐   │
   │  │  Attack Scenarios           │   │
   │  │  ├── Pod Kill (K8s)         │   │
   │  │  ├── Network Latency (TC)   │   │
   │  │  ├── CPU Stress (stress-ng) │   │
   │  │  └── DNS Failure (iptables) │   │
   │  └─────────────────────────────┘   │
   └──────────────┬─────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │           Target System             │
   │  ┌──────────┐ ┌──────────┐         │
   │  │ Service A│ │ Service B│         │
   │  └──────────┘ └──────────┘         │
   └──────────────┬─────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │         Observability               │
   │  Prometheus │ Grafana │ PagerDuty   │
   └─────────────────────────────────────┘
\`\`\`

## 8. Real-World Examples / Case Studies

**Netflix**: Chaos Monkey terminates random instances in production during business hours. Extended to Chaos Kong (AZ failure) and Chaos Gorilla (region failure).

**Amazon (GameDays)**: Scheduled chaos experiments. Teams fail over to DR, throttle dependencies, kill random servers. Results in mandatory fixes.

**Google (DiRT)**: Disaster Recovery Testing. Simulated earthquakes, network partitions, data center failures. Mandatory for all services.

## 9. Failure Scenarios & Mitigations

- **Blast radius exceeded**: Affects more than planned. Mitigation: strict limits, auto-rollback.
- **Experiment does not stop**: Attack continues. Mitigation: hard timeout (5 min max), kill switch.
- **Metrics noise**: Triggers unrelated alerts. Mitigation: label experiment traffic, mute alerts.
- **Incomplete hypothesis**: Too vague. Mitigation: quantify steady state precisely.

## 10. Interview Drills / Common Questions

- **Q**: "Where do you begin with chaos engineering?"
  - **A**: Start with monitoring (know steady state). Run non-production first. Kill one pod in staging. Gradually move to production with small blast radius.

- **Q**: "How is chaos engineering different from testing?"
  - **A**: Testing validates expected behavior. Chaos validates emergent behavior with unknown failures in production.

- **Q**: "What experiments should you run first?"
  - **A**: Based on past incidents. If DB disconnection caused an outage, run that experiment. If DNS failure caused incidents, run DNS failure.

## 11. Key Takeaways

- **Chaos finds weaknesses** before customers do.
- **Start with monitoring** — cannot measure impact without steady state.
- **Blast radius control** is critical — always have auto-rollback.
- **Start small** — kill one pod, not an entire AZ.
- **GameDays** are chaos rituals — schedule regularly.
- **Blameless culture** is prerequisite — experiments never assign blame.

## 12. References / Further Reading

- **Principles of Chaos Engineering**: https://principlesofchaos.org/
- **"Chaos Engineering"** by Casey Rosenthal and Nora Jones.
- **Netflix Tech Blog**: https://netflixtechblog.com/tagged/chaos-engineering
- **AWS Fault Injection Simulator**: https://aws.amazon.com/fis/`,
    estimatedMin: 14,
    difficulty: 'Advanced',
    companies: ['Netflix', 'Amazon', 'Google'],
    tags: ['Chaos Engineering', 'Resilience', 'Chaos Monkey', 'GameDays'],
  },
  {
    id: 'lesson-10-07',
    slug: 'production-operations-07-security-best-practices',
    title: 'Security Best Practices',
    content: `## 1. Quick Summary

**Security best practices** protect production systems from attacks and breaches. Key areas: **authentication & authorization** (OAuth 2.0, RBAC, JWT), **secrets management** (Vault, AWS Secrets Manager), **network security** (VPC, WAF, mTLS), **application security** (input validation, SQL injection prevention, CSRF, XSS), **supply chain security** (Snyk, Dependabot), and **SAST/DAST**. A data breach costs $4.45M average (IBM 2023) — security is every engineer responsibility.

## 2. Definition

**Security domains:**
- **IAM**: Who can do what? Authentication + Authorization.
- **Secrets management**: Store and rotate credentials safely.
- **Network security**: Firewalls, WAF, VPN, mTLS.
- **Application security**: OWASP Top 10 (SQLi, XSS, CSRF, SSRF).
- **Supply chain**: Dependency vulns, container scanning, SBOM.
- **Data security**: Encryption at rest and in transit.
- **Compliance**: SOC 2, HIPAA, PCI-DSS, GDPR.

**OWASP Top 10 highlights:**
1. Broken Access Control (IDOR)
2. Cryptographic Failures
3. Injection (SQL, NoSQL, OS command)
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable Components
7. Auth Failures
8. SSRF

## 3. Why It Exists / Problem It Solves

- **Adversaries** actively probe for weaknesses.
- **Data is valuable** — PII, financial, credentials.
- **Compliance is mandatory** — GDPR fines up to 4% of global revenue.
- **Trust is fragile** — one breach destroys confidence.
- **Complexity breeds vulnerabilities** — microservices increase attack surface.

## 4. When to Use It

- **Always** — security is not optional.
- **High-risk data** (PII, payment, health): maximum controls.
- **Public-facing services**: WAF, rate limiting, DDoS protection.
- **Third-party integrations**: Validate webhooks, signed requests.
- **CI/CD pipeline**: SAST, dependency scanning, container scanning.

## 5. When NOT to Use It / Tradeoffs

- **Over-engineering**: Too many controls slow development.
- **Usability impact**: Strict policies frustrate users. Use MFA + SSO.
- **Cost**: WAF, SIEM, pen testing are expensive.
- **Performance**: Encryption and mTLS add latency.
- **False positives**: SAST and WAF generate noise.

## 6. How It Works (Deep Mechanics)

**Secrets management (Vault):**
1. App authenticates to Vault (k8s SA, AWS IAM, token).
2. Vault issues short-lived (TTL: 1h) credential.
3. App uses credential, discards after TTL.
4. Vault rotates credential automatically.
5. Credential never in config files or git.

**Defense in depth:**
\`\`\`
Internet → Cloudflare (DDoS/WAF)
    → ALB (HTTPS termination)
    → WAF (OWASP rules, rate limit)
    → Kubernetes (Network Policies)
    → Service Mesh (mTLS)
    → Application (RBAC, input validation)
    → Database (encrypted at rest, IAM auth)
\`\`\`

**Secure development lifecycle:**
1. Design: Threat modeling (STRIDE).
2. Code: SAST (SonarQube, Semgrep), peer review.
3. Build: Dependency scanning (Snyk), container scan (Trivy).
4. Test: DAST (OWASP ZAP), pen testing.
5. Deploy: Infrastructure scan (tfsec, Checkov).
6. Run: WAF, runtime monitoring, SIEM.

## 7. Architecture Diagram (ASCII)

\`\`\`
Secure Architecture:

   ┌──────────────┐    ┌──────────────────┐
   │   User       │───►│  Cloudflare WAF  │
   │   (Browser)  │    │  (DDoS, rate     │
   └──────────────┘    │   limit, bot mgmt)│
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  AWS WAF + ALB   │
                       │  (HTTPS, OWASP   │
                       │   rules, geo     │
                       │   restriction)   │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Kubernetes      │
                       │  ├── Ingress     │
                       │  ├── Network Pol.│
                       │  ├── Pod: App    │
                       │  │   (mTLS)      │
                       │  └── Vault       │
                       │       sidecar    │
                       └────────┬─────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
            ┌──────────────┐      ┌──────────────┐
            │  DB (RDS)    │      │  Redis        │
            │  Enc. at rest│      │  Enc. transit │
            │  IAM auth    │      │  Auth + ACL   │
            │  Audit logs  │      └──────────────┘
            └──────────────┘
\`\`\`

## 8. Real-World Examples / Case Studies

**Stripe**: API keys scoped to resources. mTLS between services. Secrets rotated automatically. Bug bounty program.

**Cloudflare**: Zero Trust model. Every request authenticated. mTLS for service-to-service.

**Uber (2016 breach)**: AWS keys found in public GitHub repo. 57M records exfiltrated. Lesson: scan repos for secrets.

**SolarWinds (2020)**: Build system compromised. Backdoor in updates to 18,000 customers. Lesson: SBOM, signed builds.

## 9. Failure Scenarios & Mitigations

- **Credential leakage**: Secrets in git. Mitigation: pre-commit hooks, secret scanning.
- **Dependency vuln**: Log4Shell. Mitigation: SBOM, automated updates, prioritize known exploits.
- **SSRF**: Server requests internal services. Mitigation: deny-by-default egress, validate redirects.
- **DDoS**: Traffic overwhelms app. Mitigation: Cloudflare, AWS Shield, rate limiting, auto-scaling.

## 10. Interview Drills / Common Questions

- **Q**: "Design a secure auth system for a web app."
  - **A**: OAuth 2.0 + OIDC. Short-lived access tokens (15 min), long-lived refresh tokens. MFA. Rate limiting on login. Breach detection.

- **Q**: "How to handle secrets in CI/CD?"
  - **A**: Vault or Secrets Manager. Inject at deploy time, never bake into images. Rotate automatically. Audit access.

- **Q**: "What is defense in depth?"
  - **A**: Multiple security layers (WAF + network + app + encryption + audit). If one fails, others still protect.

## 11. Key Takeaways

- **Security is everyones responsibility**.
- **Defense in depth** — multiple layers protect when one fails.
- **Least privilege** — minimum permissions needed.
- **Secrets never in code** — use Vault or Secrets Manager.
- **Encrypt everything**: at rest (AES-256) and in transit (TLS 1.3).
- **Automate security** — SAST, DAST, dependency scanning in CI/CD.

## 12. References / Further Reading

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Cloudflare Learning Center**: https://www.cloudflare.com/learning/
- **HashiCorp Vault Docs**: https://developer.hashicorp.com/vault/docs
- **CIS Benchmarks**: https://www.cisecurity.org/cis-benchmarks/`,
    estimatedMin: 20,
    difficulty: 'Intermediate',
    companies: ['Stripe', 'Cloudflare', 'Uber'],
    tags: ['Security', 'OWASP', 'Secrets Management', 'Defense in Depth'],
  },
  {
    id: 'lesson-10-08',
    slug: 'production-operations-08-cost-optimization',
    title: 'Cost Optimization',
    content: `## 1. Quick Summary

**Cost optimization** maximizes business value while minimizing cloud waste. Strategies: **right-sizing** (match instance to workload), **reserved instances** (1-3 year commitment, 40-70% off), **spot instances** (up to 90% off), **auto-scaling** (scale down when idle), **storage lifecycle** (move cold data to cheaper tiers), and **FinOps** (cross-team cost governance). At scale, cloud bills exceed $100M/year — 10% reduction saves $10M.

## 2. Definition

**Cost optimization = max(Value per dollar).**

Key concepts:
- **Compute**: EC2, ECS, Lambda, Kubernetes pods.
- **Storage**: S3 classes (Standard → IA → Glacier → Deep Archive).
- **Data transfer**: Egress, cross-AZ, NAT gateway charges.
- **Reserved Instances**: 1yr (40% off) or 3yr (60% off).
- **Savings Plans**: Flexible compute $/hour commitment.
- **Spot Instances**: Up to 90% off, 2-minute termination notice.
- **FinOps**: Cultural practice + tooling for cloud financial management.

## 3. Why It Exists / Problem It Solves

Cloud costs grow exponentially:
- **Over-provisioning**: 40% of cloud spend is wasted (Flexera 2023).
- **No visibility**: Who spent what on which resource?
- **Idle resources**: Dev/staging running 24/7 unused.
- **Data transfer surprises**: Unexpected cross-region charges.

Cost optimization solves: waste reduction, unit economics, budget predictability, competitive pricing.

## 4. When to Use It

- **Growing cloud bill**: >$10K/month → invest in tooling.
- **Unpredictable costs**: >20% month-over-month variance.
- **Multi-account org**: Needs FinOps governance.
- **Startup**: Every dollar extends runway.
- **Kubernetes**: Rightsizing pods and nodes is major opportunity.

## 5. When NOT to Use It / Tradeoffs

- **Over-optimization**: Aggressive spot causes instability. Balance cost vs reliability.
- **RI lock-in**: Limits flexibility. Use convertible RIs or Savings Plans.
- **Performance impact**: Right-sizing down may cause contention.
- **Complexity**: Savings plans, RIs, spot fleets add overhead.

## 6. How It Works (Deep Mechanics)

**Right-sizing process:**
1. Collect metrics (CPU, memory, network, disk).
2. Analyze utilization (most workloads < 20%).
3. Downsize (e.g., m5.2xlarge → m5.xlarge).
4. Validate for performance degradation.
5. Automate with Compute Optimizer or Karpenter.

**Storage cost optimization:**

| S3 Class | Cost/GB/mo | Use Case |
|----------|-----------|----------|
| Standard | $0.023 | Frequently accessed |
| Infrequent Access | $0.0125 | Accessed < 1x/month |
| Glacier Instant | $0.004 | Accessed < 1x/quarter |
| Glacier Deep Archive | $0.001 | Compliance archives |

**Lifecycle policy:**
\`\`\`
Day 0-30:  S3 Standard
Day 31-90: S3 Infrequent Access
Day 91-365: S3 Glacier
Day 365+: Glacier Deep Archive (or delete)
\`\`\`

**Kubernetes cost optimization:**
- Cluster: Karpenter with spot instances.
- Pod rightsizing: VPA adjusts CPU/memory.
- HPA scales down during low traffic.
- Bin packing: increase pod density.

## 7. Architecture Diagram (ASCII)

\`\`\`
FinOps Lifecycle:

   ┌─────────┐    ┌──────────┐    ┌─────────┐
   │ Inform  │───►│ Optimize │───►│ Operate │
   │ (who    │    │ (right-  │    │ (budget │
   │  spent  │◄───│  sizing, │◄───│  alerts,│
   │  what?) │    │  RI,     │    │  show-  │
   └─────────┘    │  spot)   │    │  back)  │
                  └──────────┘    └─────────┘

Cost Decision Tree:

   Is resource used?
        │
    ┌───┴───┐
   No      Yes
    │       │
    ▼       ▼
  Delete  Can downsize?
               │
           ┌───┴───┐
          Yes      No
           │       │
           ▼       ▼
       Downsize  Reserved/Spot?
                    │
                ┌───┴───┐
               Yes      No
                │       │
                ▼       ▼
             RI/Spot  Keep as-is
\`\`\`

## 8. Real-World Examples / Case Studies

**Netflix**: 85%+ spot usage for stateless workloads. Custom spot termination handling. Saves $100M+/year.

**Spotify**: Committed Use Discounts for predictable workloads. Autoscaling reduces idle 40%. Coldline storage for archival.

**Lyft**: RIs for baseline + spot for peak. Saved 30% annually. Cost allocation by team tags.

## 9. Failure Scenarios & Mitigations

- **Spot interruption**: Jobs fail. Mitigation: spot pools across AZs, checkpointing, graceful shutdown.
- **RI over-purchase**: Bought for unused instance type. Mitigation: convertible RIs or Savings Plans, buy incrementally.
- **Optimization causes degradation**: CPU pressure. Mitigation: gradual downsizing, monitor, rollback plan.
- **Untagged resources**: Cannot attribute cost. Mitigation: enforce tagging, auto-tag in IaC.

## 10. Interview Drills / Common Questions

- **Q**: "Cloud bill increased 50% in one month. How to investigate?"
  - **A**: Cost Explorer → top services. Filter by service, region, account. Check data transfer spikes. Look for orphaned resources. Review recent deploys.

- **Q**: "Reserved vs Spot — how to decide?"
  - **A**: Baseline predictable → RI (1yr/3yr). Variable/fault-tolerant → Spot (90% off). Mix: RI for baseline + Spot for peak.

- **Q**: "Design cost allocation for multi-team org."
  - **A**: Mandatory tags (team, environment, project). Showback (not chargeback). Cost anomaly alerts per team.

## 11. Key Takeaways

- **40% of cloud spend is wasted** — right-size, stop idle resources.
- **RIs/Savings Plans**: Commit for 1-3 years, save 40-70%.
- **Spot instances**: 90% off for fault-tolerant workloads.
- **Storage lifecycle**: Move cold data automatically.
- **FinOps**: Culture + tooling for cost governance.
- **Tag everything** — cant optimize what you cant measure.

## 12. References / Further Reading

- **AWS Well-Architected — Cost Optimization**: https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/
- **FinOps Foundation**: https://www.finops.org/
- **"Cloud FinOps"** by Storment and Fuller.
- **AWS Cost Management**: https://docs.aws.amazon.com/cost-management/`,
    estimatedMin: 14,
    difficulty: 'Intermediate',
    companies: ['Netflix', 'Spotify', 'Lyft'],
    tags: ['Cost Optimization', 'FinOps', 'Right-Sizing', 'Spot Instances'],
  },
  {
    id: 'lesson-10-09',
    slug: 'production-operations-09-auto-scaling-policies',
    title: 'Auto-Scaling Policies',
    content: `## 1. Quick Summary

**Auto-scaling** automatically adjusts compute resources to match demand — scaling **out** during traffic spikes and **in** during lulls. Components: **Horizontal Pod Autoscaler (HPA)** in Kubernetes, **AWS Auto Scaling Groups**, **target tracking** (maintain CPU at 60%), **step scaling** (add N instances when metric crosses threshold), and **predictive scaling** (ML-based forecasting). Well-configured auto-scaling balances **cost** and **performance**.

## 2. Definition

**Types of auto-scaling:**
- **Horizontal**: Add/remove instances or pods. Preferred for stateless services.
- **Vertical**: Increase/decrease instance size. Limited by max size.
- **Predictive**: ML forecasts traffic, pre-provisions capacity.
- **Scheduled**: Time-based (scale up at 8 AM, down at 8 PM).

**Key metrics:**
- CPU utilization (target 50-70%).
- Memory utilization (memory-bound workloads).
- Request count per instance (web services).
- Queue depth (worker services).
- Custom business metrics.

**Scaling policies:**
- **Target tracking**: Maintain metric at target value. Simplest.
- **Step scaling**: Add N instances per threshold. More granular.
- **Scheduled**: Time-based rules.

## 3. Why It Exists / Problem It Solves

Without auto-scaling:
- **Over-provisioning**: 60-80% capacity wasted during low traffic.
- **Under-provisioning**: Cannot handle spikes → degradation, outages.
- **Manual toil**: Ops team adds instances manually (slow, error-prone).

Auto-scaling solves: cost efficiency, performance under spikes, self-healing, operational simplicity.

## 4. When to Use It

- **Stateless web services**: Perfect use case.
- **Worker/queue consumers**: Scale on queue depth.
- **Variable traffic**: Flash sales, news events, seasonal spikes.
- **Dev/test**: Scale to zero on nights/weekends.
- **Kubernetes**: HPA + Cluster Autoscaler.

## 5. When NOT to Use It / Tradeoffs

- **Stateful services**: DBs, caches — scaling is complex (resharding).
- **Cold start sensitive**: Lambda scaling adds latency.
- **Short-lived spikes**: Over-provisioning may be cheaper.
- **Licensing costs**: Per-instance license (Oracle, Windows).
- **Scaling thrash**: Rapid scale out/in wastes resources. Add cooldowns.

## 6. How It Works (Deep Mechanics)

**Kubernetes HPA:**
desiredReplicas = ceil[currentReplicas × (currentMetric / desiredMetric)]

Example: 5 pods, 80% CPU, target 50%: ceil[5 × (80/50)] = 8 pods

**AWS ASG with target tracking:**
1. Min=3, max=20, desired=5.
2. Target tracking policy: CPU = 60%.
3. CPU > 60% for 3 periods → scale out 20%.
4. CPU < 40% for 10 periods → scale in 20%.
5. Cooldown: 180 seconds.

**Predictive scaling (AWS):**
1. ML analyzes 14 days of traffic.
2. Forecasts next 48 hours.
3. Pre-scales before demand arrives.
4. Combined with target tracking for correction.

## 7. Architecture Diagram (ASCII)

\`\`\`
Auto-Scaling Decision:

   ┌────────────────────────────────────┐
   │   Metric Aggregator (CPU avg=72%)  │
   │   Scale Controller (desired=6)     │
   └──────────┬─────────────────────────┘
              │
              ▼
   ┌────────────────────────────────────┐
   │        Load Balancer               │
   │  ┌──────┐ ┌──────┐ ┌──────┐      │
   │  │ Pod1 │ │ Pod2 │ │ Pod3 │ ...   │
   │  │ 45%  │ │ 80%  │ │ 82%  │      │
   │  └──────┘ └──────┘ └──────┘      │
   │  ┌──────┐ ┌──────┐              │
   │  │ Pod5 │ │ Pod6 │ (new)        │
   │  │ 68%  │ │  0%  │              │
   │  └──────┘ └──────┘              │
   └────────────────────────────────────┘

   70% ─────────────────────────────┐
        │                             │
        │  Scale Out Zone             │
   50% ──┼── Target (CPU=50%) ───────┤
        │                             │
        │  Scale In Zone              │
   30% ──┼────────────────────────────┘
\`\`\`

## 8. Real-World Examples / Case Studies

**Amazon**: Auto-scaling for hundreds of thousands of EC2 instances. Predictive scaling for Prime Day. Pre-provisions 24h before based on ML forecasts.

**Netflix**: Request rate per instance scaling. Spot instances for most of fleet. Scale 10x during peak hours.

**Pinterest**: HPA with CPU + custom metric (RPS). Cluster Autoscaler adds nodes when pods pending.

## 9. Failure Scenarios & Mitigations

- **Scaling thrash**: Rapid out then in. Mitigation: longer cooldowns, exponential backoff.
- **Slow scaling**: Overloaded before new instances warm. Mitigation: predictive scaling, reduce warm-up.
- **Metric lag**: CloudWatch delay. Mitigation: real-time metrics (Prometheus).
- **Dependency bottleneck**: App scales but DB cannot handle connections. Mitigation: connection pooling, scale dependencies.
- **Scale-in kills busy instance**: Terminates mid-request. Mitigation: scale-in protection, drain connections.

## 10. Interview Drills / Common Questions

- **Q**: "Design auto-scaling for a spiky web API."
  - **A**: HPA with CPU target (60%) + custom RPS metric. Predictive scaling for known events. Cooldown 180s. Max 20x min. Spot for burst.

- **Q**: "How to handle DB scaling?"
  - **A**: Read replicas scale horizontally. Write scaling requires sharding. Use proxy (ProxySQL, PgBouncer) between app and DB.

- **Q**: "Worker queue auto-scaling metrics?"
  - **A**: Queue depth. Target < 100 messages. Add 1 worker per 100 messages. Scale in when empty for 5 min.

## 11. Key Takeaways

- **Auto-scaling matches supply to demand** — reduces cost and improves performance.
- **Target tracking** (CPU at 60%) is simplest effective policy.
- **Add cooldown periods** to prevent thrashing.
- **Predictive scaling** handles spikes before they happen.
- **Set hard limits** (min/max) to prevent runaway costs.
- **Choose metrics that represent real load**, not just CPU.

## 12. References / Further Reading

- **AWS Auto Scaling**: https://docs.aws.amazon.com/autoscaling/
- **Kubernetes HPA**: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- **Karpenter**: https://karpenter.sh/
- **Netflix Auto Scaling Blog**: https://netflixtechblog.com/tagged/auto-scaling`,
    estimatedMin: 16,
    difficulty: 'Intermediate',
    companies: ['Amazon', 'Netflix', 'Pinterest'],
    tags: ['Auto-Scaling', 'HPA', 'Target Tracking', 'Predictive Scaling'],
  },
  {
    id: 'lesson-10-10',
    slug: 'production-operations-10-sla-slo-sli',
    title: 'SLA / SLO / SLI',
    content: `## 1. Quick Summary

**SLA**, **SLO**, and **SLI** form the reliability measurement framework used by Google SRE. **SLIs** are raw metrics (p99 latency = 150ms). **SLOs** are targets (p99 < 200ms, 99.9% of time over 30 days). **SLAs** are contractual commitments (99.99% uptime with service credits). **Error budgets** (100% - SLO) define acceptable unreliability. If exhausted, deploy velocity slows. Burn rate alerts detect violations faster.

## 2. Definition

**SLI (Service Level Indicator)** — quantitative measure.
- Availability: successful requests / total requests.
- Latency: p99 response time over 1-minute window.
- Durability: probability of data loss.

**SLO (Service Level Objective)** — target value over window.
- "99.9% of requests succeed over 30 days."
- "p99 latency < 200ms for 99.9% of windows."

**SLA (Service Level Agreement)** — contract with consequences.
- "99.95% monthly uptime SLA." Violation → service credits.

**Error Budget** = 100% - SLO (e.g., 99.9% → 0.1% = 43 min/month).
- Within budget → deploy freely.
- Exhausted → no risky deploys until budget recovers.

## 3. Why It Exists / Problem It Solves

Without SLOs:
- No definition of "good enough."
- Teams pursue 100% reliability (diminishing returns).
- Every incident treated as SEV1.
- Disagreements over commitments.

SLOs solve: shared vocabulary, data-driven decisions, customer alignment, sane tradeoffs, accurate alerting.

## 4. When to Use It

- **Any production service**: Define at least one SLO.
- **Customer-facing services**: SLA mandatory for enterprise.
- **Multi-tier architecture**: Each tier needs SLOs.
- **Migrations**: Measure if new system is "as good as" old.

## 5. When NOT to Use It / Tradeoffs

- **Prototype/early stage**: Focus on product-market fit.
- **Over-engineering SLIs**: 20 SLIs create confusion. Start with 2-3.
- **SLO perfectionism**: 99.999% when 99.9% is fine.
- **Short windows**: 1-week SLOs have high variance. Use 30-day.

## 6. How It Works (Deep Mechanics)

**SLI specification (HTTP API):**
\`\`\`
SLI: availability
Definition: non-5xx / total requests
Window: 1-minute rolling
PromQL: sum(rate(http_requests_total{status!~"5.."}[1m]))
        / sum(rate(http_requests_total[1m]))
\`\`\`

**SLO: 99.9% availability over 30 days (rolling).**

**Error budget calculation:**
Monthly budget = (1 - SLO) × total requests
Example: 10M req/month, 99.9% SLO → 10,000 failed requests

**Burn rate alerting:**

| Burn Rate | Time to Exhaust | Action |
|-----------|----------------|--------|
| 1x | 30 days | No alert |
| 2x | 15 days | Warning |
| 10x | 3 days | Critical page |

## 7. Architecture Diagram (ASCII)

\`\`\`
SLO Framework:

   ┌────────────┐    ┌────────────┐    ┌────────────┐
   │   SLI      │───►│   SLO      │───►│   SLA      │
   │ (metric)   │    │ (target)   │    │ (contract) │
   │            │    │            │    │            │
   │ Latency    │    │ p99 < 200ms│    │ 99.99%     │
   │ p99=150ms  │    │ 99.9% time │    │ uptime     │
   └────────────┘    └─────┬──────┘    └────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  Error Budget  │
                  │  100% - SLO    │
                  │  Remaining:    │
                  │  23/43 min     │
                  └────────┬───────┘
                           │
               ┌───────────┴───────────┐
               │                       │
               ▼                       ▼
       ┌──────────────┐      ┌──────────────┐
       │ Budget OK    │      │ Exhausted    │
       │ Deploy freely│      │ Freeze deploys│
       └──────────────┘      └──────────────┘

Burn Rate:

   Error Rate
   1.0% ── CRITICAL (10x burn, 3 days left)
   0.5% ── WARNING (2x burn, 15 days left)
   0.1% ── SLO line ──────────────────────
   0.05% ─ OK (within budget)
\`\`\`

## 8. Real-World Examples / Case Studies

**Google SRE**: Every service has SLOs. Gmail: 99.99% consumer, 99.9% enterprise. SLO violations trigger mandatory postmortems.

**Amazon**: Internal SLOs per team. Services violating SLOs cannot launch features. AWS publishes SLAs for each service.

**Stripe**: SLO-based alerting. Error budgets tracked weekly. Teams that exhaust budget restricted from deploys.

## 9. Failure Scenarios & Mitigations

- **SLO too tight**: 99.999% → cannot deploy. Mitigation: match SLO to user needs, not pride.
- **SLO too loose**: 99% → users complain. Mitigation: set based on user experience.
- **Measurement error**: Misses failure modes. Mitigation: careful definition, exclude planned maintenance.
- **Error budget anxiety**: Stop all deploys. Mitigation: budget is meant to be spent.

## 10. Interview Drills / Common Questions

- **Q**: "Define an SLO for a payment API."
  - **A**: SLI: success rate (2xx/total). SLO: 99.95% over 30 days. EB: 0.05%. Alert on burn rate > 5x for 10 min.

- **Q**: "SLO vs SLA difference?"
  - **A**: SLO is internal target (aspirational). SLA is contractual (with penalties). SLO is usually stricter.

- **Q**: "Error budget exhausted. What do you do?"
  - **A**: Stop non-critical deploys. Focus on reliability. Add monitoring. Let budget recover.

## 11. Key Takeaways

- **SLI = measure, SLO = promise, SLA = contract.**
- **Error budget** = 100% - SLO. Defines acceptable unreliability.
- **Burn rate alerts** are better than static thresholds.
- **Start simple**: 2-3 SLIs per service (availability, latency, durability).
- **SLO should match user experience**, not engineering perfection.

## 12. References / Further Reading

- **Google SRE Book — Chapters 4-5**: https://sre.google/sre-book/
- **"Implementing Service Level Objectives"** by Alex Hidalgo.
- **SLO Alerting with Prometheus**: https://prometheus.io/docs/practices/alerting/
- **AWS SLA Documentation**: https://aws.amazon.com/legal/service-level-agreements/`,
    estimatedMin: 15,
    difficulty: 'Advanced',
    companies: ['Google', 'Amazon', 'Stripe'],
    tags: ['SLA', 'SLO', 'SLI', 'Error Budget', 'Burn Rate'],
  },
  {
    id: 'lesson-10-11',
    slug: 'production-operations-11-capacity-planning',
    title: 'Capacity Planning',
    content: `## 1. Quick Summary

**Capacity planning** ensures the right infrastructure for current and future load — without over-provisioning (waste) or under-provisioning (outages). Process involves **demand forecasting** (traffic trends, business growth), **resource modeling** (CPU/memory/network per request), **load testing** (validate limits), and **procurement planning**. Approaches: **top-down** (business → traffic → capacity), **bottom-up** (component → system), and **trend-based** (extrapolate growth). At hyperscale (Meta, Google), capacity planning has 6-12 month lead times.

## 2. Definition

**Top-down**: Business metrics (users, revenue) → infrastructure metrics (RPS, storage) → capacity.
**Bottom-up**: Component capacity (1 server = X RPS) → total servers.
**Trend-based**: Historical growth extrapolation.

**Key metrics:**
- Request rate (RPS, QPS).
- Peak-to-average ratio (flash sales: 10x average).
- Growth rate (monthly %).
- Resource per request (CPU, memory, I/O).
- Headroom (buffer above peak, typically 20-50%).

## 3. Why It Exists / Problem It Solves

Without capacity planning:
- **Outages during growth**: Viral traffic → servers cant handle → downtime.
- **Wasted spend**: Over-provisioning doubles bill.
- **Slow procurement**: Physical servers take 8-12 weeks.
- **No cost visibility**: Infrastructure budget unknown.

Capacity planning solves: business continuity, cost predictability, procurement timing, performance guarantees.

## 4. When to Use It

- **Post-PMF startups**: Userbase growing 20-50% monthly.
- **Before major launches**: New feature, campaign, expansion.
- **Seasonal businesses**: Black Friday, holiday traffic.
- **Hardware procurement**: On-prem 6-month lead time.
- **Annual planning**: Next year infrastructure forecast.

## 5. When NOT to Use It / Tradeoffs

- **Early MVPs**: Growth uncertain; pay-as-you-go works.
- **Rapidly changing architecture**: Model becomes obsolete.
- **Over-analysis**: 5% accuracy is fine with cloud elasticity.
- **Static models**: Use auto-scaling for dynamic adjustment.

## 6. How It Works (Deep Mechanics)

**Top-down process:**
1. Business forecast: "2M new users next year."
2. User behavior: "50 requests/day per user."
3. Traffic forecast: 2M × 50 / 86400 = 1157 RPS avg.
4. Peak factor: 5x → 5785 RPS peak.
5. Resource per request: 50ms CPU, 10MB memory (from load test).
6. Capacity: 5785 RPS × 50ms = 289 CPU-sec/sec → 289 cores.
7. Headroom (60% target): 289 / 0.6 = 482 cores.
8. Instance selection: m5.large (2 cores) → 241 instances.

**Bottom-up (simpler):**
1. Load test: single instance handles 100 RPS at 60% CPU.
2. Expected peak: 5000 RPS → 50 instances.
3. Add 50% safety → 75 instances.
4. 12 months growth at 10% monthly → 75 × 1.1^12 = 235.

## 7. Architecture Diagram (ASCII)

\`\`\`
Capacity Planning Process:

   ┌──────────┐  ┌──────────┐  ┌──────────────────┐
   │ Business  │  │ Product  │  │ Historical       │
   │ Forecast  │  │ Roadmap  │  │ Growth Trends    │
   └────┬─────┘  └────┬─────┘  └────────┬─────────┘
        │             │                 │
        ▼             ▼                 ▼
   ┌─────────────────────────────────────────────┐
   │          Capacity Model                      │
   │  Traffic = Users × Requests/user / time      │
   │  Resources = Traffic × Resource/request      │
   │  Instances = Resources / Per-instance cap    │
   │  Cost = Instances × Price × time             │
   └────────────────────┬────────────────────────┘
                        │
                        ▼
   ┌────────────┐  ┌────────────┐  ┌──────────────┐
   │ Capacity   │  │ Procurement│  │ Cost         │
   │ Plan       │  │ Schedule   │  │ Forecast     │
   └────────────┘  └────────────┘  └──────────────┘
\`\`\`

## 8. Real-World Examples / Case Studies

**Netflix**: Capacity planning team models global streaming traffic. Handles peak hours, new show releases, and regional growth. Uses auto-scaling for short-term, modeling for quarterly procurement.

**Cloudflare**: 200+ edge locations. Models traffic growth per DC. Procures servers 6 months ahead. Trend-based with seasonal adjustment.

**Uber**: Rides fluctuate hourly. Models driver availability + rider demand. Pre-provisions for surge. Spot + on-demand hybrid.

## 9. Failure Scenarios & Mitigations

- **Overly optimistic growth**: Plan 3x, actual 10x. Mitigation: buffer (20-50% headroom), cloud elasticity.
- **Model drift**: User behavior changes. Mitigation: quarterly review, compare forecast vs actual.
- **Under-provisioning for launch**: Unexpected spike. Mitigation: auto-scaling, emergency capacity.
- **Vendor lead time**: Cloud capacity crunch. Mitigation: multi-cloud, reserved capacity.

## 10. Interview Drills / Common Questions

- **Q**: "Design capacity plan for a social platform expecting 10x growth."
  - **A**: Load test current (200 RPS/server). Current: 10K RPS, 50 servers. Next year: 100K RPS → 500 servers + 50% headroom = 750. Cloud + 25% RI + 75% spot.

- **Q**: "Top-down vs bottom-up — when to use each?"
  - **A**: Top-down for long-range (6-12 months) with business forecasts. Bottom-up for short-term (1-3 months) with component metrics.

- **Q**: "How to handle seasonal spikes?"
  - **A**: Build for peak + 20% headroom. Use auto-scaling. Schedule capacity before season.

## 11. Key Takeaways

- **Capacity planning prevents outages** and controls cost.
- **Combine top-down** (business) with **bottom-up** (component metrics).
- **Load testing** provides resource-per-request data.
- **Always include headroom**: 20-50% above peak.
- **Review quarterly** — forecasts change, models drift.
- **Cloud elasticity reduces risk** but planning still matters for cost.

## 12. References / Further Reading

- **Google SRE Book — Chapter 6 (Capacity Planning)**: https://sre.google/sre-book/
- **AWS Well-Architected Framework**: https://docs.aws.amazon.com/wellarchitected/latest/framework/
- **"The Art of Capacity Planning"** by John Allspaw.
- **k6 (load testing)**: https://k6.io/`,
    estimatedMin: 14,
    difficulty: 'Advanced',
    companies: ['Netflix', 'Cloudflare', 'Uber'],
    tags: ['Capacity Planning', 'Forecasting', 'Load Testing', 'Scaling'],
  },
  {
    id: 'lesson-10-12',
    slug: 'production-operations-12-postmortem-culture',
    title: 'Postmortem Culture',
    content: `## 1. Quick Summary

**Postmortem culture** is the practice of conducting blameless, systematic analyses after incidents. Originating from Google SRE, a **blameless postmortem** focuses on systemic failures, not individual mistakes. Components: **timeline**, **root cause analysis** (5 whys), **contributing factors**, **action items** (with owners and deadlines), and **follow-up tracking**. Companies with strong postmortem culture (Google, Amazon, Netflix, Stripe) treat incidents as learning opportunities, reducing recurrence.

## 2. Definition

**Postmortem** = written record of an incident including impact, timeline, root cause, and prevention actions.

**Blameless postmortem principles:**
1. **Assume good intent**: Everyone acted with available information.
2. **Focus on system**: "How did the system allow this failure?"
3. **No blame**: No punitive action for causing incidents.
4. **Share openly**: Postmortems public within company.
5. **Actionable outcomes**: Concrete tracked action items.
6. **Psychological safety**: Engineers report mistakes without fear.

**Postmortem document template:**
- Incident summary
- Impact (users, duration, revenue)
- Timeline (UTC timestamps)
- Detection method
- Root cause
- Contributing factors
- Mitigation steps
- Resolution
- Lessons learned
- Action items (with owners and deadlines)

## 3. Why It Exists / Problem It Solves

Without postmortem culture:
- **Repeat incidents**: Same root cause, same outage.
- **Blame culture**: Engineers hide mistakes. No one learns.
- **Lost knowledge**: Incident details vanish after Slack DMs.
- **No accountability**: Action items forgotten.
- **Fear of deployment**: Past mistakes not addressed.

Postmortem culture solves: systematic improvement, knowledge sharing, psychological safety, accountability, reduced incident recurrence.

## 4. When to Use It

- **After any significant incident**: SEV1/SEV2 always require postmortem.
- **Near-misses**: Incidents that could have been severe.
- **SLO violations**: Repeated violations deserve analysis.
- **New patterns**: Novel failure modes need documentation.
- **Post-launch**: Major feature or migration launches.

## 5. When NOT to Use It / Tradeoffs

- **Over-processing**: Every minor issue does not need a postmortem.
- **Analysis paralysis**: Spending weeks on root cause for a 5-minute blip.
- **Too slow**: Postmortem weeks after incident loses context. Write within 48h.
- **Blame leaking**: Even in "blameless" culture, blame can seep in.
- **Action item debt**: Too many action items tracked but never completed.

## 6. How It Works (Deep Mechanics)

**Postmortem process:**

1. **Schedule**: Within 48 hours of incident resolution.
2. **Gather data**: Timeline from monitoring, logs, chat, notes.
3. **Draft document**: IC or scribe writes initial draft.
4. **Review meeting**: IC, SMEs, stakeholders review together.
5. **Identify root cause**: Use 5 Whys technique.
6. **Define action items**: Each has owner and deadline.
7. **Track**: Action items added to team backlog.
8. **Share**: Postmortem published to internal wiki.

**5 Whys example:**
- Incident: Production DB became read-only.
- Why? Disk full.
- Why? Automated purge job failed.
- Why? Purge job crashed due to OOM.
- Why? Data volume grew 5x, job not updated.
- Root cause: Capacity planning gap for purge job.
- Action: Update purge job for new data volume + add monitoring + alert on disk usage.

**Action item types:**
- **Prevent**: Fix the root cause permanently.
- **Detect**: Add monitoring for the failure mode.
- **Mitigate**: Add automated response (auto-scale, restart).
- **Process**: Update runbook, add training, change process.

## 7. Architecture Diagram (ASCII)

\`\`\`
Postmortem Workflow:

   Incident Resolved (SEV1/SEV2)
        │
        ▼
   Schedule Postmortem (within 48h)
        │
        ▼
   ┌─────────────────────────────────┐
   │  Gather Data                    │
   │  ├── Monitoring dashboards      │
   │  ├── Chat logs                  │
   │  ├── Deployment history         │
   │  ├── Scribe notes               │
   │  └── On-call engineer interview │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  Draft Postmortem Document      │
   │  ├── Timeline                   │
   │  ├── Root cause (5 Whys)        │
   │  ├── Contributing factors       │
   │  ├── Lessons learned            │
   │  └── Action items               │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  Review Meeting                 │
   │  ├── IC presents timeline       │
   │  ├── SMEs validate analysis     │
   │  ├── Action items prioritized   │
   │  └── Owners assigned            │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  Publish & Track                │
   │  ├── Wiki / shared doc          │
   │  ├── Action items in backlog    │
   │  ├── Review at weekly ops       │
   │  └── Close when items complete  │
   └─────────────────────────────────┘
\`\`\`

## 8. Real-World Examples / Case Studies

**Google SRE**: Every incident requires a postmortem. Blameless by default. Action items are tracked as bugs with priority. Postmortems are searchable internally — engineers learn from others incidents.

**Amazon (COE)**: Correction of Errors documents. Executives review COEs weekly. Root cause must be identified at the system level. Action items are mandatory with VP-level accountability.

**Netflix**: Postmortems are part of the chaos engineering feedback loop. Every incident produces action items that feed the experiment roadmap. Engineers present postmortems at company-wide meetings.

**Stripe**: Blameless postmortem culture deeply embedded. Incident review docs shared with all engineers. Action items tracked in the same system as feature work with assigned owners and deadlines.

## 9. Failure Scenarios & Mitigations

- **Postmortem never scheduled**: Team moves on. Mitigation: automated reminder, manager enforces.
- **Blameless in name only**: Subtle blame language creeps in. Mitigation: review for blame language, culture training.
- **Too many action items**: Team overwhelmed. Mitigation: prioritize top 3 items per postmortem.
- **Action items not completed**: No follow-through. Mitigation: track in sprint backlog, review at ops meetings.
- **Same incident happens again**: Action items were ineffective. Mitigation: deeper root cause analysis, verify fixes prevented recurrence.

## 10. Interview Drills / Common Questions

- **Q**: "Walk me through your postmortem process."
  - **A**: Within 48h of resolution, gather data (dashboards, logs, chat). Draft document with timeline, root cause (5 Whys), contributing factors, action items. Review with IC, SMEs, stakeholders. Publish to wiki. Track action items until completion.

- **Q**: "What makes a postmortem blameless?"
  - **A**: Focus on system failures, not people. Assume everyone acted with good intent with available information. No punitive outcomes. Action items target automation, monitoring, and process improvement — not individual retraining.

- **Q**: "How do you ensure action items from postmortems get completed?"
  - **A**: Track in team backlog with owners and deadlines. Review at weekly ops meetings. Escalate blockers to engineering manager. Complete within 2 sprints or justify why not.

- **Q**: "How do you handle a postmortem where the root cause is human error?"
  - **A**: Dig deeper — why did the system allow a human error to cause an outage? Add guardrails, automation, or process changes. Never assign blame. The goal is to make the system resilient to human mistakes.

## 11. Key Takeaways

- **Blameless postmortems** focus on systems, not people.
- **Schedule within 48 hours** while context is fresh.
- **Use 5 Whys** to find true root cause — not just symptoms.
- **Action items must have owners and deadlines** or they will not be done.
- **Share openly** so other teams learn from your incident.
- **Psychological safety** is the foundation — without it, engineers hide incidents.
- **Track to completion** — uncompleted action items are the top reason incidents recur.

## 12. References / Further Reading

- **Google SRE Book — Chapter 15 (Postmortem)**: https://sre.google/sre-book/
- **"Blameless Postmortems"** (Atlassian): https://www.atlassian.com/incident-management/postmortem
- **Etsy "Blameless Postmortems"**: https://codeascraft.com/2012/05/22/blameless-postmortems/
- **PagerDuty Postmortem Template**: https://response.pagerduty.com/
- **"The Five Whys"** by Taiichi Ohno.`,
    estimatedMin: 12,
    difficulty: 'Intermediate',
    companies: ['Google', 'Amazon', 'Netflix', 'Stripe'],
    tags: ['Postmortem', 'Blameless Culture', 'Incident Analysis', 'SRE', '5 Whys'],
  },
];
