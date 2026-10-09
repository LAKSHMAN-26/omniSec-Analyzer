export type IdentityNodeType =
  | 'user'
  | 'privilegedUser'
  | 'group'
  | 'computer'
  | 'application'
  | 'resource';

export type RelationshipType =
  | 'memberOf'
  | 'canModify'
  | 'canAccess'
  | 'administers';

export interface IdentityNode {
  id: string;
  label: string;
  type: IdentityNodeType;
  description: string;
  properties: Record<string, string>;
  privileged?: boolean;
  x: number;
  y: number;
}

export interface IdentityRelationship {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  explanation: string;
  remediation: string;
  enabled: boolean;
}

export interface IdentityEnvironment {
  organization: string;
  nodes: IdentityNode[];
  relationships: IdentityRelationship[];
}

export const acmeDemoEnvironment: IdentityEnvironment = {
  organization: 'Acme Corporation',
  nodes: [
    { id: 'user-alex', label: 'Alex Morgan', type: 'user', description: 'Standard IT support analyst.', properties: { account: 'amorgan', department: 'IT Support', privilege: 'Standard user' }, x: 90, y: 95 },
    { id: 'user-jamie', label: 'Jamie Chen', type: 'user', description: 'Standard service desk analyst.', properties: { account: 'jchen', department: 'Service Desk', privilege: 'Standard user' }, x: 90, y: 195 },
    { id: 'user-riley', label: 'Riley Patel', type: 'user', description: 'Standard operations analyst.', properties: { account: 'rpatel', department: 'Operations', privilege: 'Standard user' }, x: 90, y: 295 },
    { id: 'user-taylor', label: 'Taylor Brooks', type: 'user', description: 'Finance reporting analyst.', properties: { account: 'tbrooks', department: 'Finance', privilege: 'Standard user' }, x: 90, y: 395 },
    { id: 'user-jordan', label: 'Jordan Lee', type: 'user', description: 'Finance accounts coordinator.', properties: { account: 'jlee', department: 'Finance', privilege: 'Standard user' }, x: 90, y: 495 },
    { id: 'user-casey', label: 'Casey Rivera', type: 'user', description: 'Cloud operations engineer.', properties: { account: 'crivera', department: 'Engineering', privilege: 'Standard user' }, x: 90, y: 595 },
    { id: 'user-sam', label: 'Sam Okafor', type: 'user', description: 'Application support analyst.', properties: { account: 'sokafor', department: 'IT', privilege: 'Standard user' }, x: 90, y: 695 },
    { id: 'user-drew', label: 'Drew Kim', type: 'user', description: 'Software engineer.', properties: { account: 'dkim', department: 'Product Engineering', privilege: 'Standard user' }, x: 90, y: 795 },
    { id: 'user-avery', label: 'Avery Singh', type: 'user', description: 'Quality engineer.', properties: { account: 'asingh', department: 'Product Engineering', privilege: 'Standard user' }, x: 90, y: 895 },
    { id: 'user-parker', label: 'Parker Ellis', type: 'user', description: 'Standard help desk analyst.', properties: { account: 'pellis', department: 'IT Support', privilege: 'Standard user' }, x: 90, y: 995 },
    { id: 'user-quinn', label: 'Quinn Foster', type: 'privilegedUser', description: 'Privileged directory administrator (demo identity).', properties: { account: 'qfoster-admin', department: 'Identity Operations', privilege: 'Privileged user' }, privileged: true, x: 90, y: 1095 },
    { id: 'user-robin', label: 'Robin Diaz', type: 'privilegedUser', description: 'Privileged cloud administrator (demo identity).', properties: { account: 'rdiaz-cloudadmin', department: 'Cloud Operations', privilege: 'Privileged user' }, privileged: true, x: 90, y: 1195 },

    { id: 'group-it-support', label: 'IT Support', type: 'group', description: 'Tier 1 endpoint and service desk support group.', properties: { groupId: 'GRP-AC-101', scope: 'Help desk operations' }, x: 370, y: 120 },
    { id: 'group-service-desk', label: 'Service Desk', type: 'group', description: 'Front-line service desk group.', properties: { groupId: 'GRP-AC-102', scope: 'Support' }, x: 370, y: 270 },
    { id: 'group-finance', label: 'Finance Readers', type: 'group', description: 'Read-only access group for finance reporting.', properties: { groupId: 'GRP-AC-103', scope: 'Finance reporting' }, x: 370, y: 420 },
    { id: 'group-cloud-ops', label: 'Cloud Operators', type: 'group', description: 'Cloud workload operations group.', properties: { groupId: 'GRP-AC-104', scope: 'Cloud operations' }, x: 370, y: 600 },
    { id: 'group-server-admins', label: 'Server Administrators', type: 'group', description: 'Privileged group with explicit server administrative permissions.', properties: { groupId: 'GRP-AC-105', scope: 'Server administration' }, privileged: true, x: 650, y: 175 },

    { id: 'computer-server-01', label: 'Server-01', type: 'computer', description: 'Production application server.', properties: { assetId: 'CMP-AC-001', platform: 'Windows Server', environment: 'Production' }, privileged: true, x: 930, y: 155 },
    { id: 'computer-db-01', label: 'DB-01', type: 'computer', description: 'Finance reporting database host.', properties: { assetId: 'CMP-AC-002', platform: 'Linux', environment: 'Production' }, privileged: true, x: 930, y: 285 },
    { id: 'computer-build-02', label: 'Build-Agent-02', type: 'computer', description: 'Build worker with release signing capability.', properties: { assetId: 'CMP-AC-003', platform: 'Linux', environment: 'Build' }, privileged: true, x: 930, y: 560 },
    { id: 'computer-workstation-12', label: 'Workstation-12', type: 'computer', description: 'Shared engineering workstation.', properties: { assetId: 'CMP-AC-004', platform: 'Windows 11', environment: 'Corporate' }, x: 650, y: 860 },

    { id: 'app-payroll', label: 'Payroll Portal', type: 'application', description: 'Internal payroll reporting application.', properties: { appId: 'APP-AC-201', owner: 'Finance Systems', access: 'Read-only reports' }, x: 650, y: 405 },
    { id: 'app-identity', label: 'Identity Admin Console', type: 'application', description: 'Privileged identity management console.', properties: { appId: 'APP-AC-202', owner: 'Identity Operations', access: 'Directory administration' }, privileged: true, x: 930, y: 760 },
    { id: 'app-ticketing', label: 'Acme Service Desk', type: 'application', description: 'Internal support ticketing application.', properties: { appId: 'APP-AC-203', owner: 'IT Operations', access: 'Ticket management' }, x: 650, y: 1010 },

    { id: 'resource-payroll-reports', label: 'Payroll Reports', type: 'resource', description: 'Read-only payroll report collection.', properties: { resourceId: 'RES-AC-301', classification: 'Confidential', privilege: 'Business data' }, x: 930, y: 430 },
    { id: 'resource-signing-vault', label: 'Release Signing Vault', type: 'resource', description: 'Credential store for signing production releases.', properties: { resourceId: 'RES-AC-302', classification: 'Restricted', privilege: 'Privileged resource' }, privileged: true, x: 930, y: 940 }
  ],
  relationships: [
    { id: 'rel-01', source: 'user-alex', target: 'group-it-support', type: 'memberOf', explanation: 'Alex is a member of IT Support.', remediation: 'Review group membership against current job responsibilities.', enabled: true },
    { id: 'rel-02', source: 'user-jamie', target: 'group-service-desk', type: 'memberOf', explanation: 'Jamie is a member of Service Desk.', remediation: 'Review group membership against current job responsibilities.', enabled: true },
    { id: 'rel-03', source: 'user-riley', target: 'group-service-desk', type: 'memberOf', explanation: 'Riley is a member of Service Desk.', remediation: 'Review group membership against current job responsibilities.', enabled: true },
    { id: 'rel-04', source: 'user-taylor', target: 'group-finance', type: 'memberOf', explanation: 'Taylor is a member of Finance Readers.', remediation: 'Review group membership against current job responsibilities.', enabled: true },
    { id: 'rel-05', source: 'user-jordan', target: 'group-finance', type: 'memberOf', explanation: 'Jordan is a member of Finance Readers.', remediation: 'Review group membership against current job responsibilities.', enabled: true },
    { id: 'rel-06', source: 'user-casey', target: 'group-cloud-ops', type: 'memberOf', explanation: 'Casey is a member of Cloud Operators.', remediation: 'Review group membership against current job responsibilities.', enabled: true },
    { id: 'rel-07', source: 'user-sam', target: 'group-it-support', type: 'memberOf', explanation: 'Sam is a member of IT Support.', remediation: 'Review group membership against current job responsibilities.', enabled: true },
    { id: 'rel-08', source: 'user-drew', target: 'group-service-desk', type: 'memberOf', explanation: 'Drew is a member of Service Desk.', remediation: 'Review group membership against current job responsibilities.', enabled: true },
    { id: 'rel-09', source: 'user-avery', target: 'group-service-desk', type: 'memberOf', explanation: 'Avery is a member of Service Desk.', remediation: 'Review group membership against current job responsibilities.', enabled: true },
    { id: 'rel-10', source: 'user-parker', target: 'group-service-desk', type: 'memberOf', explanation: 'Parker is a member of Service Desk.', remediation: 'Review group membership against current job responsibilities.', enabled: true },
    { id: 'rel-11', source: 'user-quinn', target: 'group-server-admins', type: 'memberOf', explanation: 'Quinn is explicitly assigned to Server Administrators.', remediation: 'Restrict privileged group membership and use time-bound elevation where possible.', enabled: true },
    { id: 'rel-12', source: 'user-robin', target: 'group-cloud-ops', type: 'memberOf', explanation: 'Robin is explicitly assigned to Cloud Operators.', remediation: 'Restrict privileged group membership and use time-bound elevation where possible.', enabled: true },

    { id: 'rel-13', source: 'group-it-support', target: 'group-server-admins', type: 'canModify', explanation: 'IT Support can modify Server Administrators membership. This delegated control creates a potential route into a privileged group.', remediation: 'Remove delegated group-membership modification from IT Support; require approval through a privileged access workflow.', enabled: true },
    { id: 'rel-14', source: 'group-server-admins', target: 'computer-server-01', type: 'administers', explanation: 'Server Administrators has explicit administrative permission over Server-01.', remediation: 'Limit server administrator membership and audit privileged access.', enabled: true },
    { id: 'rel-15', source: 'group-server-admins', target: 'computer-db-01', type: 'administers', explanation: 'Server Administrators has explicit administrative permission over DB-01.', remediation: 'Limit server administrator membership and audit privileged access.', enabled: true },
    { id: 'rel-16', source: 'group-service-desk', target: 'group-cloud-ops', type: 'canModify', explanation: 'Service Desk can modify Cloud Operators membership. This delegated control creates a second potential privilege path.', remediation: 'Remove delegated Cloud Operators membership changes from Service Desk and require owner approval.', enabled: true },
    { id: 'rel-17', source: 'group-cloud-ops', target: 'computer-build-02', type: 'administers', explanation: 'Cloud Operators has explicit administrative permission over Build-Agent-02.', remediation: 'Use a dedicated build operator role with narrowly scoped, monitored permissions.', enabled: true },
    { id: 'rel-18', source: 'group-cloud-ops', target: 'app-identity', type: 'canAccess', explanation: 'Cloud Operators can access the Identity Admin Console, but this relationship alone does not grant administrative control.', remediation: 'Review whether Cloud Operators needs console access; enforce a separate administrative role.', enabled: true },
    { id: 'rel-19', source: 'user-taylor', target: 'app-payroll', type: 'canAccess', explanation: 'Taylor can access read-only reports in Payroll Portal.', remediation: 'Review access periodically and retain read-only scope where appropriate.', enabled: true },
    { id: 'rel-20', source: 'user-jordan', target: 'app-payroll', type: 'canAccess', explanation: 'Jordan can access read-only reports in Payroll Portal.', remediation: 'Review access periodically and retain read-only scope where appropriate.', enabled: true },
    { id: 'rel-21', source: 'group-finance', target: 'resource-payroll-reports', type: 'canAccess', explanation: 'Finance Readers can access the Payroll Reports collection.', remediation: 'Maintain least-privilege read access and periodic entitlement reviews.', enabled: true },
    { id: 'rel-22', source: 'group-service-desk', target: 'app-ticketing', type: 'canAccess', explanation: 'Service Desk can manage support tickets in Acme Service Desk.', remediation: 'Keep ticketing permissions scoped to support duties.', enabled: true },
    { id: 'rel-23', source: 'app-ticketing', target: 'resource-payroll-reports', type: 'canAccess', explanation: 'Ticket attachments can link to sanitized payroll report examples; this grants no administrative access.', remediation: 'Keep shared attachments sanitized and limit access to approved support tickets.', enabled: true },
    { id: 'rel-24', source: 'group-service-desk', target: 'computer-workstation-12', type: 'canAccess', explanation: 'Service Desk can access the shared engineering workstation for support.', remediation: 'Keep workstation support access limited to approved support staff.', enabled: true }
  ]
};
