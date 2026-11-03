# Architecture
- Preventive maintenance uses shared domain helpers for effective status, filters and summaries in both the page and PDF, preventing divergent counts and overdue rules.
- PDF export consumes the already-authorized filtered page records and logs the export through the existing central audit RPC; database policies remain authoritative.