-- Dedicated human administrator capability; never included in a personal AI token.
INSERT INTO permissions(key,description) VALUES('network.manage','Register approved database network endpoints') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(organization_id,role_id,permission_key)
SELECT organization_id,id,'network.manage' FROM roles WHERE key='platform_account_admin'
ON CONFLICT DO NOTHING;
GRANT INSERT ON network_endpoints,credential_profiles TO eas_api;
