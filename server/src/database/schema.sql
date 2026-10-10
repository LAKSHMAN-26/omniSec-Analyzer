-- CyberSentinel AI Database Schema

CREATE TABLE IF NOT EXISTS scan_history (
    id TEXT PRIMARY KEY,
    module_name TEXT NOT NULL,
    target_environment TEXT NOT NULL,
    start_time TEXT NOT NULL,
    completion_time TEXT,
    status TEXT NOT NULL, -- COMPLETED, FAILED, IN_PROGRESS, CANCELLED
    findings_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    passed_count INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    untested_count INTEGER DEFAULT 0,
    summary TEXT
);

CREATE TABLE IF NOT EXISTS scan_findings (
    id TEXT PRIMARY KEY,
    scan_id TEXT NOT NULL,
    title TEXT NOT NULL,
    severity TEXT NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW, INFO
    category TEXT NOT NULL,
    affected_target TEXT NOT NULL,
    evidence TEXT,
    risk_explanation TEXT,
    remediation TEXT,
    status TEXT NOT NULL, -- FAIL, FINDING, WARNING, PASS, MANUAL REVIEW REQUIRED, NOT TESTED, ERROR, INCONCLUSIVE
    FOREIGN KEY(scan_id) REFERENCES scan_history(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS application_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,
    details TEXT NOT NULL
);

-- Registered Local Educational Lab Targets (Strict Whitelist)
CREATE TABLE IF NOT EXISTS lab_targets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'vulnerable' | 'secure'
    base_url TEXT NOT NULL,
    description TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);

-- Real-time Scan Jobs
CREATE TABLE IF NOT EXISTS scan_jobs (
    id TEXT PRIMARY KEY,
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    target_url TEXT NOT NULL,
    owasp_edition TEXT NOT NULL DEFAULT '2021',
    status TEXT NOT NULL, -- 'PENDING', 'RUNNING', 'COMPLETED', 'CANCELLED', 'FAILED'
    start_time TEXT NOT NULL,
    completion_time TEXT,
    total_checks INTEGER DEFAULT 0,
    completed_checks INTEGER DEFAULT 0,
    findings_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    passed_count INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    untested_count INTEGER DEFAULT 0,
    manual_review_count INTEGER DEFAULT 0,
    summary TEXT,
    FOREIGN KEY(target_id) REFERENCES lab_targets(id)
);

-- Individual Checks Performed in Real-time Scans
CREATE TABLE IF NOT EXISTS scan_checks (
    id TEXT PRIMARY KEY,
    scan_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    check_name TEXT NOT NULL,
    target_endpoint TEXT NOT NULL,
    http_method TEXT NOT NULL,
    status TEXT NOT NULL, -- 'PASS', 'FAIL', 'FINDING', 'WARNING', 'MANUAL REVIEW REQUIRED', 'NOT TESTED', 'ERROR', 'INCONCLUSIVE'
    severity TEXT NOT NULL, -- 'Critical', 'High', 'Medium', 'Low', 'Informational', 'None'
    confidence TEXT NOT NULL, -- 'High', 'Medium', 'Low'
    evidence TEXT,
    explanation TEXT,
    remediation TEXT,
    limitations TEXT,
    created_at TEXT NOT NULL,
    duration_ms INTEGER DEFAULT 0,
    wstg_references TEXT,
    FOREIGN KEY(scan_id) REFERENCES scan_jobs(id) ON DELETE CASCADE
);

-- Synthetic Demo Data for Educational Testing Lab
CREATE TABLE IF NOT EXISTS synthetic_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user', 'admin', 'analyst'
    full_name TEXT NOT NULL,
    email TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS synthetic_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT NOT NULL
);

-- Default Settings Initialization
INSERT OR IGNORE INTO application_settings (key, value) VALUES ('owasp_edition', '2021');
INSERT OR IGNORE INTO application_settings (key, value) VALUES ('theme', 'dark');
INSERT OR IGNORE INTO application_settings (key, value) VALUES ('demo_mode', 'true');

-- Default Lab Targets
INSERT OR IGNORE INTO lab_targets (id, name, target_type, base_url, description, is_active, created_at)
VALUES 
('lab-vulnerable', 'Vulnerable Demo Application (Educational)', 'vulnerable', 'http://127.0.0.1:5000/api/lab/vulnerable', 'Deliberately weakened local educational lab demonstrating OWASP Top 10 flaws.', 1, datetime('now')),
('lab-secure', 'Secure Demo Application (Defensive Reference)', 'secure', 'http://127.0.0.1:5000/api/lab/secure', 'Hardened defensive implementation enforcing authentication, parameterized queries, and security headers.', 1, datetime('now'));

-- Default Synthetic Users (Educational dummy data only)
INSERT OR IGNORE INTO synthetic_users (id, username, password_hash, role, full_name, email)
VALUES
(1, 'alice_student', 'sha256_mock_hash_student_pass', 'user', 'Alice Johnson (Student)', 'alice@lab.internal'),
(2, 'bob_faculty', 'sha256_mock_hash_faculty_pass', 'user', 'Bob Smith (Faculty)', 'bob@lab.internal'),
(3, 'admin_sentinel', 'sha256_mock_hash_admin_pass', 'admin', 'SecOps Admin', 'admin@sentinel.internal');

-- Default Synthetic Products (Educational dummy data only)
INSERT OR IGNORE INTO synthetic_products (id, name, category, price, description)
VALUES
(1, 'Sentinel Hardware Token', 'Security Hardware', 49.99, 'Two-factor hardware authentication device'),
(2, 'SOC Dashboard License', 'Software', 199.00, 'Enterprise dashboard monitoring suite'),
(3, 'Network Packet Analyzer Cable', 'Accessories', 19.50, 'High-grade shielded diagnostic ethernet cable');
