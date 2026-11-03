export interface paths {
    "/healthz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Process liveness
         * @description Process liveness
         */
        get: operations["health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/readyz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Business readiness
         * @description Stage00 always returns 503 STAGE00_EXECUTION_DISABLED; 200 reserved for later stages.
         */
        get: operations["readiness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Current authenticated identity
         * @description Current authenticated identity
         */
        get: operations["getMe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Current memberships
         * @description Current memberships
         */
        get: operations["listOrganizations"];
        put?: never;
        /**
         * Create organization
         * @description Create organization
         */
        post: operations["createOrganization"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{orgId}/members": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Organization members
         * @description Organization members
         */
        get: operations["listOrganizationMembers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{orgId}/members/{userId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Set organization membership
         * @description Set organization membership
         */
        put: operations["upsertOrganizationMember"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List visible roles
         * @description List visible roles
         */
        get: operations["listRoles"];
        put?: never;
        /**
         * Create Role
         * @description Create Role
         */
        post: operations["createRole"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/resource-grants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List visible resource-grants
         * @description List visible resource-grants
         */
        get: operations["listResourceGrants"];
        put?: never;
        /**
         * Create ResourceGrant
         * @description Create ResourceGrant
         */
        post: operations["createResourceGrant"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** listApps */
        get: operations["listApps"];
        put?: never;
        /** createApp */
        post: operations["createApp"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/logical-data-sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Visible logical data sources
         * @description Visible logical data sources
         */
        get: operations["listLogicalDataSources"];
        put?: never;
        /**
         * Create logical data source
         * @description Create logical data source
         */
        post: operations["createLogicalDataSource"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/physical-connections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List sanitized physical connections
         * @description List sanitized physical connections
         */
        get: operations["listPhysicalConnections"];
        put?: never;
        /**
         * Create connection using approved endpoint and credential alias
         * @description Create connection using approved endpoint and credential alias
         */
        post: operations["createPhysicalConnection"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/datasets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List authorized datasets
         * @description List authorized datasets
         */
        get: operations["listDatasets"];
        put?: never;
        /**
         * Create dataset under enabled logical source
         * @description Create dataset under enabled logical source
         */
        post: operations["createDataset"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** listReports */
        get: operations["listReports"];
        put?: never;
        /** createReport */
        post: operations["createReport"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/release-requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** listReleaseRequests */
        get: operations["listReleaseRequests"];
        put?: never;
        /** createReleaseRequest */
        post: operations["createReleaseRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List permission dictionary
         * @description List permission dictionary
         */
        get: operations["listPermissions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/roles/{roleId}/permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Replace role permissions
         * @description Replace role permissions
         */
        put: operations["setRolePermissions"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/role-bindings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Assign organization role
         * @description Assign organization role
         */
        post: operations["createRoleBinding"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/role-bindings/{roleBindingId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Revoke role binding
         * @description Revoke role binding
         */
        delete: operations["deleteRoleBinding"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/resource-grants/{resourceGrantId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Revoke grant and invalidate pending results
         * @description Revoke grant and invalidate pending results
         */
        delete: operations["deleteResourceGrant"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** getApp */
        get: operations["getApp"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update app metadata
         * @description Update app metadata
         */
        patch: operations["updateApp"];
        trace?: never;
    };
    "/apps/{appId}/members/{userId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Set app membership
         * @description Set app membership
         */
        put: operations["setAppMember"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/artifacts/uploads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Allocate bounded source upload
         * @description Upload bytes to returned same-origin PUT path; finalized server hash must match before app version creation. 10 MiB compressed, 100 MiB unpacked, 1000 files; deny symlinks/traversal.
         */
        post: operations["createArtifactUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/artifacts/content/{artifactId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Upload source archive bytes */
        put: operations["uploadArtifactContent"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * listAppVersions
         * @description Read immutable version metadata with current application membership and dataset.read field/metric visibility. Catalog administrators retain catalog inspection access. TEST execution grants, live query policies and database connections are not required for metadata inspection; preview, build, restore and release continue to enforce execution authorization independently.
         */
        get: operations["listAppVersions"];
        put?: never;
        /** uploadAppVersion */
        post: operations["uploadAppVersion"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/app-versions/{appVersionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read app version
         * @description Read app version
         */
        get: operations["getAppVersion"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/app-versions/{appVersionId}/builds": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * createBuild
         * @description 对路径指定的不可变源码版本排队构建。兼容不带请求体和空JSON对象两种按钮调用；任何非空字段仍被拒绝。身份、应用维护权限与TEST数据权限均由服务器检查。
         */
        post: operations["createBuild"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/build-jobs/{buildJobId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** getBuildJob */
        get: operations["getBuildJob"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/physical-connections/{physicalConnectionId}/credentials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Rotate credential reference
         * @description Rotate credential reference
         */
        post: operations["rotateCredential"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/physical-connections/{physicalConnectionId}/tests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Queue health-only probe; production requires independent permission
         * @description Queue health-only probe; production requires independent permission
         */
        post: operations["createConnectionTest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/connection-tests/{connectionTestId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read health probe result
         * @description Read health probe result
         */
        get: operations["getConnectionTest"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/logical-data-sources/{logicalDataSourceId}/mappings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Current environment mapping revisions
         * @description Current environment mapping revisions
         */
        get: operations["listSourceMappings"];
        /**
         * Append immutable TEST or PROD mapping revision
         * @description Append immutable TEST or PROD mapping revision
         */
        put: operations["setSourceMapping"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/datasets/{datasetId}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List authorized immutable semantic versions
         * @description List authorized immutable semantic versions
         */
        get: operations["listDatasetVersions"];
        put?: never;
        /**
         * Seal dataset fields, metrics and relation definitions
         * @description Seal dataset fields, metrics and relation definitions
         */
        post: operations["createDatasetVersion"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/dataset-versions/{datasetVersionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read field-filtered authorized semantic schema
         * @description Read field-filtered authorized semantic schema
         */
        get: operations["getDatasetVersion"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports/{reportId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** getReport */
        get: operations["getReport"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports/{reportId}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * listReportVersions
         * @description Read immutable version metadata with current application membership and dataset.read field/metric visibility. Catalog administrators retain catalog inspection access. TEST execution grants, live query policies and database connections are not required for metadata inspection; preview, build, restore and release continue to enforce execution authorization independently.
         */
        get: operations["listReportVersions"];
        put?: never;
        /** saveReportVersion */
        post: operations["saveReportVersion"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report-versions/{reportVersionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read report version
         * @description Read report version
         */
        get: operations["getReportVersion"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/queries/test": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** createTestQuery */
        post: operations["createTestQuery"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/query-jobs/{queryJobId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** getQueryJob */
        get: operations["getQueryJob"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/query-jobs/{queryJobId}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** cancelQueryJob */
        post: operations["cancelQueryJob"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/release-requests/{releaseRequestId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** getReleaseRequest */
        get: operations["getReleaseRequest"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/release-requests/{releaseRequestId}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** submitReleaseRequest */
        post: operations["submitReleaseRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/release-requests/{releaseRequestId}/approvals": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** listApprovals */
        get: operations["listApprovals"];
        put?: never;
        /** createApproval */
        post: operations["createApproval"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/release-requests/{releaseRequestId}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** cancelReleaseRequest */
        post: operations["cancelReleaseRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/release-requests/{releaseRequestId}/deployments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** createDeployment */
        post: operations["createDeployment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/deployments/{deploymentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** getDeployment */
        get: operations["getDeployment"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/rollback-requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** createRollbackRequest */
        post: operations["createRollbackRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/deployments/{deploymentId}/grants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read production grants
         * @description Read production grants
         */
        get: operations["listRuntimeGrants"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runtime-grants/{runtimeGrantId}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Revoke runtime access immediately
         * @description Revoke runtime access immediately
         */
        post: operations["revokeRuntimeGrant"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runtime/apps/{appId}/context": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Resolve active deployment
         * @description Resolve active deployment
         */
        get: operations["getRuntimeContext"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runtime/apps/{appId}/queries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** createRuntimeQuery */
        post: operations["createRuntimeQuery"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runtime/reports/{reportId}/queries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** createReportQuery */
        post: operations["createReportQuery"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/audit-logs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read sanitized organization audit events
         * @description Read sanitized organization audit events
         */
        get: operations["listAuditLogs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runtime/apps/{appId}/collections/{collectionKey}/records": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List authorized managed records
         * @description List authorized managed records
         */
        get: operations["listRuntimeAppRecords"];
        put?: never;
        /**
         * Create managed record
         * @description Create managed record
         */
        post: operations["createRuntimeAppRecord"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runtime/apps/{appId}/collections/{collectionKey}/records/{recordId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Soft-delete owned managed record
         * @description Soft-delete owned managed record
         */
        delete: operations["deleteRuntimeAppRecord"];
        options?: never;
        head?: never;
        /**
         * Update owned managed record
         * @description Update owned managed record
         */
        patch: operations["updateRuntimeAppRecord"];
        trace?: never;
    };
    "/apps/{appId}/preview/{appVersionId}/collections/{collectionKey}/records": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List authorized managed records
         * @description List authorized managed records
         */
        get: operations["listPreviewAppRecords"];
        put?: never;
        /**
         * Create managed record
         * @description Create managed record
         */
        post: operations["createPreviewAppRecord"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/preview/{appVersionId}/collections/{collectionKey}/records/{recordId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Soft-delete owned managed record
         * @description Soft-delete owned managed record
         */
        delete: operations["deletePreviewAppRecord"];
        options?: never;
        head?: never;
        /**
         * Update owned managed record
         * @description Update owned managed record
         */
        patch: operations["updatePreviewAppRecord"];
        trace?: never;
    };
    "/logical-data-sources/{logicalDataSourceId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read visible source
         * @description Read visible source
         */
        get: operations["getLogicalDataSource"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update or disable source
         * @description Update or disable source
         */
        patch: operations["updateLogicalDataSource"];
        trace?: never;
    };
    "/physical-connections/{physicalConnectionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update connection status, timeout and pool limits
         * @description Update connection status, timeout and pool limits
         */
        patch: operations["updatePhysicalConnection"];
        trace?: never;
    };
    "/network-endpoints": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read operator-approved endpoint inventory
         * @description Read operator-approved endpoint inventory
         */
        get: operations["listNetworkEndpoints"];
        put?: never;
        /**
         * 管理员登记网络端点及精确库表范围
         * @description 仅人类网络管理员可登记白名单，不触发连接或生产查询。地址固定IPv4/32，禁用特殊地址，强制TLS。可显式将同环境的既有企业凭据别名复制绑定至新端点，不返回秘密引用或密码。
         */
        post: operations["createNetworkEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/credential-profiles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read credential aliases without references or secrets
         * @description Read credential aliases without references or secrets
         */
        get: operations["listCredentialProfiles"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/database-adapters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read adapter validation status
         * @description Read adapter validation status
         */
        get: operations["listDatabaseAdapters"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/physical-connections/{physicalConnectionId}/metadata-syncs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Synchronize explicitly allowed relation metadata
         * @description Synchronize explicitly allowed relation metadata
         */
        post: operations["createMetadataSync"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/physical-connections/{physicalConnectionId}/metadata": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read successful immutable metadata snapshots
         * @description Read successful immutable metadata snapshots
         */
        get: operations["listMetadataSnapshots"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/catalog-jobs/{catalogJobId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read current authorized job result
         * @description Read current authorized job result
         */
        get: operations["getCatalogJob"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/catalog-jobs/{catalogJobId}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a recoverable retry of failed health or sync job
         * @description Create a recoverable retry of failed health or sync job
         */
        post: operations["retryCatalogJob"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/datasets/{datasetId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read authorized dataset
         * @description Read authorized dataset
         */
        get: operations["getDataset"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update dataset metadata and lifecycle
         * @description Update dataset metadata and lifecycle
         */
        patch: operations["updateDataset"];
        trace?: never;
    };
    "/datasets/{datasetId}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Preview authorized TEST data only
         * @description Retired: returns 410 QUERY_GATEWAY_REQUIRED. Use POST /queries/test; old catalog preview jobs cannot be leased or read.
         */
        post: operations["previewDataset"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/datasets/{datasetId}/grants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read resource grants
         * @description Read resource grants
         */
        get: operations["listDatasetGrants"];
        put?: never;
        /**
         * Create scoped resource grant
         * @description Create scoped resource grant
         */
        post: operations["createDatasetGrant"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/logical-data-sources/{logicalDataSourceId}/grants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read resource grants
         * @description Read resource grants
         */
        get: operations["listSourceGrants"];
        put?: never;
        /**
         * Create scoped resource grant
         * @description Create scoped resource grant
         */
        post: operations["createSourceGrant"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/queries/test/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** validateTestQuery */
        post: operations["validateTestQuery"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/queries/test/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** createTestExport */
        post: operations["createTestExport"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/queries/diagnostics/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** diagnoseQuery */
        post: operations["diagnoseQuery"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/query-jobs/{queryJobId}/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** downloadQueryExport */
        get: operations["downloadQueryExport"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runtime/apps/{appId}/queries/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** validateappsQuery */
        post: operations["validateappsQuery"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runtime/apps/{appId}/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** exportappsQuery */
        post: operations["exportappsQuery"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runtime/reports/{reportId}/queries/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** validatereportsQuery */
        post: operations["validatereportsQuery"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runtime/reports/{reportId}/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** exportreportsQuery */
        post: operations["exportreportsQuery"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/datasets/{datasetId}/query-policies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** listQueryPolicies */
        get: operations["listQueryPolicies"];
        put?: never;
        /** createQueryPolicy */
        post: operations["createQueryPolicy"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{orgId}/members/{userId}/data-scope": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** setMemberDataScope */
        post: operations["setMemberDataScope"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/query-audits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** listQueryAudits */
        get: operations["listQueryAudits"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/capabilities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** studioCapabilities */
        get: operations["studioCapabilities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/versions/{appVersionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * getAppVersion
         * @description Read immutable version metadata with current application membership and dataset.read field/metric visibility. Catalog administrators retain catalog inspection access. TEST execution grants, live query policies and database connections are not required for metadata inspection; preview, build, restore and release continue to enforce execution authorization independently.
         */
        get: operations["getStudioAppVersion"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** restoreAppVersion */
        post: operations["restoreAppVersion"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/preview/{appVersionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** getTestPreview */
        get: operations["getTestPreview"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/preview/{appVersionId}/queries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** queryTestApp */
        post: operations["queryTestApp"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports/{reportId}/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** restoreReportVersion */
        post: operations["restoreReportVersion"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/release-status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** studioReleaseStatus */
        get: operations["studioReleaseStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/sharing": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 读取站点分享设置
         * @description Organization-authenticated, immutable TEST sharing. Private links require current app membership; organization links do not grant dataset or source/development rights. Anonymous and cross-organization requests are denied.
         */
        get: operations["getSiteSharing"];
        put?: never;
        /**
         * 更新站点私有或组织内链接公开设置
         * @description Organization-authenticated, immutable TEST sharing. Private links require current app membership; organization links do not grant dataset or source/development rights. Anonymous and cross-organization requests are denied.
         */
        post: operations["updateSiteSharing"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/site-shares/{shareId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 以当前访问者身份打开分享的TEST站点
         * @description Organization-authenticated, immutable TEST sharing. Private links require current app membership; organization links do not grant dataset or source/development rights. Anonymous and cross-organization requests are denied.
         */
        get: operations["getSharedSite"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/site-shares/{shareId}/queries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 执行分享版本绑定的TEST查询
         * @description Organization-authenticated, immutable TEST sharing. Private links require current app membership; organization links do not grant dataset or source/development rights. Anonymous and cross-organization requests are denied.
         */
        post: operations["querySharedSite"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/tokens": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * listPersonalTokens
         * @description Opaque personal token; read/develop TEST scope intersects current RBAC and resource grants. No production, approval or administrator actions. Creation returns plaintext once; only hash is stored. Repeating issuance key returns 409 TOKEN_ALREADY_ISSUED, never plaintext replay. Lost response requires revoke and reissue. Listing is newest 100, active limit 20, issuance limit 50/day.
         */
        get: operations["listPersonalTokens"];
        put?: never;
        /**
         * createPersonalToken
         * @description Opaque personal token; read/develop TEST scope intersects current RBAC and resource grants. No production, approval or administrator actions. Creation returns plaintext once; only hash is stored. Repeating issuance key returns 409 TOKEN_ALREADY_ISSUED, never plaintext replay. Lost response requires revoke and reissue. Listing is newest 100, active limit 20, issuance limit 50/day.
         */
        post: operations["createPersonalToken"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/tokens/{tokenId}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * revokePersonalToken
         * @description Opaque personal token; read/develop TEST scope intersects current RBAC and resource grants. No production, approval or administrator actions. Creation returns plaintext once; only hash is stored. Repeating issuance key returns 409 TOKEN_ALREADY_ISSUED, never plaintext replay. Lost response requires revoke and reissue. Listing is newest 100, active limit 20, issuance limit 50/day.
         */
        post: operations["revokePersonalToken"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * getAuthOptions
         * @description Password browser session uses HttpOnly SameSite=Strict cookie; mutations require allowed Origin and X-CSRF-Token. Password-only sessions cannot use production or release approval. Registration uses a valid one-use invitation, or an organization that currently allows direct registration. Organization policy is locked and rechecked inside the registration transaction. Direct registration creates a fixed business developer role; clients cannot choose roles or privileges. No public admin bootstrap. Password and cookie never enter logs; all responses no-store. First-login password change enforced by server. Invitation secret returned once, never replayed.
         */
        get: operations["getAuthOptions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * passwordLogin
         * @description Password browser session uses HttpOnly SameSite=Strict cookie; mutations require allowed Origin and X-CSRF-Token. Password-only sessions cannot use production or release approval. Registration uses a valid one-use invitation, or an organization that currently allows direct registration. Organization policy is locked and rechecked inside the registration transaction. Direct registration creates a fixed business developer role; clients cannot choose roles or privileges. No public admin bootstrap. Password and cookie never enter logs; all responses no-store. First-login password change enforced by server. Invitation secret returned once, never replayed.
         */
        post: operations["passwordLogin"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * passwordRegister
         * @description Password browser session uses HttpOnly SameSite=Strict cookie; mutations require allowed Origin and X-CSRF-Token. Password-only sessions cannot use production or release approval. Registration uses a valid one-use invitation, or an organization that currently allows direct registration. Organization policy is locked and rechecked inside the registration transaction. Direct registration creates a fixed business developer role; clients cannot choose roles or privileges. No public admin bootstrap. Password and cookie never enter logs; all responses no-store. First-login password change enforced by server. Invitation secret returned once, never replayed.
         */
        post: operations["passwordRegister"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * getBrowserSession
         * @description Password browser session uses HttpOnly SameSite=Strict cookie; mutations require allowed Origin and X-CSRF-Token. Password-only sessions cannot use production or release approval. Registration uses a valid one-use invitation, or an organization that currently allows direct registration. Organization policy is locked and rechecked inside the registration transaction. Direct registration creates a fixed business developer role; clients cannot choose roles or privileges. No public admin bootstrap. Password and cookie never enter logs; all responses no-store. First-login password change enforced by server. Invitation secret returned once, never replayed.
         */
        get: operations["getBrowserSession"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * passwordLogout
         * @description Password browser session uses HttpOnly SameSite=Strict cookie; mutations require allowed Origin and X-CSRF-Token. Password-only sessions cannot use production or release approval. Registration uses a valid one-use invitation, or an organization that currently allows direct registration. Organization policy is locked and rechecked inside the registration transaction. Direct registration creates a fixed business developer role; clients cannot choose roles or privileges. No public admin bootstrap. Password and cookie never enter logs; all responses no-store. First-login password change enforced by server. Invitation secret returned once, never replayed.
         */
        post: operations["passwordLogout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * changePassword
         * @description Password browser session uses HttpOnly SameSite=Strict cookie; mutations require allowed Origin and X-CSRF-Token. Password-only sessions cannot use production or release approval. Registration uses a valid one-use invitation, or an organization that currently allows direct registration. Organization policy is locked and rechecked inside the registration transaction. Direct registration creates a fixed business developer role; clients cannot choose roles or privileges. No public admin bootstrap. Password and cookie never enter logs; all responses no-store. First-login password change enforced by server. Invitation secret returned once, never replayed.
         */
        post: operations["changePassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/registration-invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * listRegistrationInvitations
         * @description Password browser session uses HttpOnly SameSite=Strict cookie; mutations require allowed Origin and X-CSRF-Token. Password-only sessions cannot use production or release approval. Registration uses a valid one-use invitation, or an organization that currently allows direct registration. Organization policy is locked and rechecked inside the registration transaction. Direct registration creates a fixed business developer role; clients cannot choose roles or privileges. No public admin bootstrap. Password and cookie never enter logs; all responses no-store. First-login password change enforced by server. Invitation secret returned once, never replayed.
         */
        get: operations["listRegistrationInvitations"];
        put?: never;
        /**
         * createRegistrationInvitation
         * @description Password browser session uses HttpOnly SameSite=Strict cookie; mutations require allowed Origin and X-CSRF-Token. Password-only sessions cannot use production or release approval. Registration uses a valid one-use invitation, or an organization that currently allows direct registration. Organization policy is locked and rechecked inside the registration transaction. Direct registration creates a fixed business developer role; clients cannot choose roles or privileges. No public admin bootstrap. Password and cookie never enter logs; all responses no-store. First-login password change enforced by server. Invitation secret returned once, never replayed.
         */
        post: operations["createRegistrationInvitation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/registration-invitations/{invitationId}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * revokeRegistrationInvitation
         * @description Password browser session uses HttpOnly SameSite=Strict cookie; mutations require allowed Origin and X-CSRF-Token. Password-only sessions cannot use production or release approval. Registration uses a valid one-use invitation, or an organization that currently allows direct registration. Organization policy is locked and rechecked inside the registration transaction. Direct registration creates a fixed business developer role; clients cannot choose roles or privileges. No public admin bootstrap. Password and cookie never enter logs; all responses no-store. First-login password change enforced by server. Invitation secret returned once, never replayed.
         */
        post: operations["revokeRegistrationInvitation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/workspace": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * getServerWorkspace
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        get: operations["getServerWorkspace"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/workspace/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * readServerWorkspaceFile
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        post: operations["readServerWorkspaceFile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/workspace/write": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * writeServerWorkspace
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        post: operations["writeServerWorkspace"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/workspace/edit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * editServerWorkspace
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        post: operations["editServerWorkspace"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/workspace/remove": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * removeServerWorkspaceFiles
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        post: operations["removeServerWorkspaceFiles"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/workspace/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * moveServerWorkspaceFile
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        post: operations["moveServerWorkspaceFile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/workspace/checkout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * checkoutServerWorkspace
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        post: operations["checkoutServerWorkspace"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/workspace/commit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * commitServerWorkspace
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        post: operations["commitServerWorkspace"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/physical-connections/configure": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 直接填写服务器、数据库和账号配置物理连接
         * @description 人类管理员一次填写地址、数据库及账号；服务端自动创建网络白名单和加密凭据引用。密码writeOnly，不回显或进入日志/幂等响应；TEST/PROD密钥及目录分离。仅本机开发TEST可关闭TLS。登记不直接执行生产查询。
         */
        post: operations["configurePhysicalConnection"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/deployments/{deploymentId}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** retryDeployment */
        post: operations["retryDeployment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/deployments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** listDeployments */
        get: operations["listDeployments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/release-policy": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** getReleasePolicy */
        get: operations["getReleasePolicy"];
        /** setReleasePolicy */
        put: operations["setReleasePolicy"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runtime/apps/{appId}/site": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** productionSite */
        get: operations["productionSite"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/runtime/apps/{appId}/bound-queries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** productionBoundQuery */
        post: operations["productionBoundQuery"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/release-options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Current organization members eligible for release audiences and approval routing */
        get: operations["releaseOptions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/debug-sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** openStudioDebugSession */
        post: operations["openStudioDebugSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/debug-sessions/{debugSessionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** getStudioDebugSession */
        get: operations["getStudioDebugSession"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/debug-sessions/{debugSessionId}/actions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** actStudioDebugSession */
        post: operations["actStudioDebugSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/debug-sessions/{debugSessionId}/screenshot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** captureStudioDebugScreenshot */
        get: operations["captureStudioDebugScreenshot"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/debug-sessions/{debugSessionId}/close": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** closeStudioDebugSession */
        post: operations["closeStudioDebugSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/registration-settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 读取当前组织的注册设置
         * @description Current interactive organization administrator with account.manage. Updates are persisted, audited, revision checked and idempotent. Changes apply to public registration immediately. Open registration creates ordinary business developers without dataset grants or administrator access.
         */
        get: operations["getRegistrationSettings"];
        put?: never;
        /**
         * 修改当前组织是否需要邀请码
         * @description Current interactive organization administrator with account.manage. Updates are persisted, audited, revision checked and idempotent. Changes apply to public registration immediately. Open registration creates ordinary business developers without dataset grants or administrator access.
         */
        post: operations["updateRegistrationSettings"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/student-center/enable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 为私有站点初始化学生事务工作台
         * @description 身份来自当前登录会话，组织、站点成员、工作台角色及不可变版本能力在服务端实时校验。学生和模板存入平台托管记录，不使用或切换企业生产数据源。操作遵守 Idempotency-Key；读请求同样不缓存。
         */
        post: operations["enableStudentCenter"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/public/site-shares/{shareId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 免平台登录读取公开站点
         * @description 只返回当前仍标为 public 的固定版本页面产物。不会赋予匿名访问者数据集权限、源码编辑权限或站内账号身份。
         */
        get: operations["getPublicSharedSite"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/student-centers/{appId}/actions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 站点独立账号与业务操作
         * @description 使用学生事务站点自己的 HttpOnly Cookie 会话，与平台账号完全独立。除登录/会话外要求站点账号、当前角色和 CSRF。所有动作受当前站点版本和数据隔离约束。
         */
        post: operations["studentCenterIndependentAction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/site-data-sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * listSiteDataSources
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        get: operations["listSiteDataSources"];
        put?: never;
        /**
         * configureSiteDataSource
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        post: operations["configureSiteDataSource"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/site-data-sources/inspect": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * inspectSiteDataSource
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        post: operations["inspectSiteDataSource"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/site-runtime": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * getSiteRuntime
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        get: operations["getSiteRuntime"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/site-runtime/deploy": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * deployTestSiteRuntime
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        post: operations["deployTestSiteRuntime"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/site-runtime/activate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * activateTestSiteVersion
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        post: operations["activateTestSiteVersion"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/site-apps/{appId}/request": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * requestSiteBackend
         * @description 服务器源码工作区；实时应用成员鉴权，无本地路径或服务器命令。revision比较交换与幂等键防止丢失更新。草稿可修改，已提交版本不可变。
         */
        post: operations["requestSiteBackend"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apps/{appId}/versions/{appVersionId}/source": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read immutable source snapshot for version comparison
         * @description Read sealed source bytes without changing workspace or version. Requires current application developer/maintainer membership and live TEST dataset/field grants. No metadata administrator bypass. Source is never executed; response is not cacheable.
         */
        get: operations["getStudioVersionSource"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Health: {
            /** @enum {string} */
            status: "ok";
            /** @enum {string} */
            service: "platform-api";
            /** @enum {string} */
            stage: "architecture" | "catalog";
        };
        Error: {
            error: {
                /** @enum {string} */
                code: "VALIDATION_ERROR" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "STATE_CONFLICT" | "PRECONDITION_REQUIRED" | "REVISION_MISMATCH" | "IDEMPOTENCY_CONFLICT" | "APPROVAL_REQUIRED" | "SELF_APPROVAL_FORBIDDEN" | "GRANT_REVOKED" | "ENVIRONMENT_FORBIDDEN" | "MAPPING_CHANGED" | "SCHEMA_MISMATCH" | "QUERY_REJECTED" | "QUERY_LIMIT_EXCEEDED" | "RATE_LIMITED" | "DEPENDENCY_UNAVAILABLE" | "INTERNAL_ERROR" | "STAGE00_EXECUTION_DISABLED" | "NETWORK_ADDRESS_FORBIDDEN" | "CONNECTION_FAILED" | "CONNECTION_TIMEOUT" | "CREDENTIAL_UNAVAILABLE" | "METADATA_SYNC_FAILED" | "RELATION_FORBIDDEN" | "ADAPTER_UNVERIFIED" | "LEASE_EXPIRED" | "POLICY_CHANGED" | "TOKEN_ALREADY_ISSUED" | "TOKEN_LIMIT_REACHED" | "PASSWORD_POLICY" | "INVALID_CREDENTIALS" | "AUTH_RATE_LIMITED" | "AUTH_BUSY" | "PASSWORD_AUTH_DISABLED" | "PASSWORD_CHANGE_REQUIRED" | "INVITATION_INVALID" | "ACCOUNT_UNAVAILABLE" | "CSRF_REJECTED" | "WORKSPACE_REVISION_CONFLICT" | "WORKSPACE_EDIT_CONFLICT" | "WORKSPACE_PROJECT_INCOMPLETE" | "WORKSPACE_MANIFEST_INVALID" | "SOURCE_PATH_REJECTED" | "SOURCE_LIMIT_EXCEEDED" | "CREDENTIAL_STORE_UNAVAILABLE" | "INVALID_FILTER_BINDING" | "INVALID_QUERY_BINDING" | "RESOURCE_GRANT_EXPIRED" | "RESOURCE_GRANT_REQUIRED" | "VERSION_METADATA_ACCESS_DENIED" | "INVITATION_REQUIRED" | "REGISTRATION_SETTINGS_CHANGED" | "REGISTRATION_ROLE_INVALID" | "STUDENT_FILE_INVALID" | "STUDENT_IMPORT_COLUMNS" | "STUDENT_IMPORT_INVALID" | "STUDENT_FIELD_INVALID" | "STUDENT_NUMBER_EXISTS" | "STUDENT_REVISION_CHANGED" | "STUDENT_RECORD_NOT_FOUND" | "STUDENT_CENTER_ACCESS_DENIED" | "STUDENT_CENTER_ADMIN_REQUIRED" | "STUDENT_TEMPLATE_CHANGED" | "STUDENT_MEMBER_INVALID" | "STUDENT_LAST_ADMIN" | "STUDENT_SERVICE_UNAVAILABLE" | "TEMPLATE_INVALID" | "TEMPLATE_EXTERNAL_RESOURCE" | "TEMPLATE_FIELD_UNKNOWN" | "TEMPLATE_RENDER_FAILED" | "CERTIFICATE_FIELDS_REQUIRED" | "SITE_CAPABILITY_REQUIRED" | "STUDENT_LOGIN_REQUIRED" | "STUDENT_INVALID_CREDENTIALS" | "STUDENT_ACCOUNT_EXISTS";
                /** @description Safe message; excludes credentials and raw SQL. */
                message: string;
                /** @description Trace identifier */
                requestId: string;
                details?: {
                    /** @description Invalid input path */
                    field: string;
                    /** @description Safe validation reason */
                    reason: string;
                }[];
            };
            /** Format: uuid */
            traceId?: string;
        };
        User: {
            /** Format: uuid */
            id: string;
            /** @description OIDC issuer + subject identity; no password */
            subject: string;
            displayName: string;
            /** @enum {string} */
            status: "active" | "disabled";
        };
        Organization: {
            /** Format: uuid */
            id: string;
            key: string;
            name: string;
            revision: number;
            /** Format: date-time */
            createdAt: string;
        };
        CreateOrganization: {
            key: string;
            name: string;
        };
        OrganizationMember: {
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            userId: string;
            /** @enum {string} */
            status: "active" | "disabled";
            /** Format: date-time */
            createdAt: string;
            displayName?: string;
        };
        UpsertOrganizationMember: {
            /** @enum {string} */
            status: "active" | "disabled";
        };
        Role: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            key: string;
            name: string;
        };
        CreateRole: {
            key: string;
            name: string;
        };
        Permission: {
            /** @description Action name, e.g. dataset.query.test */
            key: string;
            /** @description Permission meaning */
            description: string;
        };
        SetRolePermissions: {
            permissionKeys: string[];
        };
        RoleBinding: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            userId: string;
            /** Format: uuid */
            roleId: string;
        };
        CreateRoleBinding: {
            /** Format: uuid */
            userId: string;
            /** Format: uuid */
            roleId: string;
        };
        ResourceGrant: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            resourceId: string;
            /** Format: uuid */
            principalUserId: string;
            /** @enum {string} */
            action: "app.read" | "app.edit" | "report.read" | "report.edit" | "report.view" | "dataset.read" | "dataset.query.test" | "release.review";
            /** Format: date-time */
            expiresAt: string;
        };
        CreateResourceGrant: {
            /** Format: uuid */
            resourceId: string;
            /** Format: uuid */
            principalUserId: string;
            /** @enum {string} */
            action: "app.read" | "app.edit" | "report.read" | "report.edit" | "report.view" | "dataset.read" | "dataset.query.test" | "release.review";
            /** Format: date-time */
            expiresAt: string;
        };
        App: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            key: string;
            name: string;
            /** Format: uuid */
            ownerUserId: string;
            revision: number;
        };
        CreateApp: {
            key: string;
            name: string;
        };
        UpdateApp: {
            name: string;
        };
        AppMember: {
            /** Format: uuid */
            appId: string;
            /** Format: uuid */
            userId: string;
            /** @enum {string} */
            role: "viewer" | "developer" | "maintainer";
        };
        SetAppMember: {
            /** @enum {string} */
            role: "viewer" | "developer" | "maintainer";
        };
        CreateAppVersion: {
            /** @description Previously uploaded artifact key in org namespace; no URL */
            sourceArtifactKey: string;
            sourceDigest: string;
            reportVersionIds: string[];
            manifest: {
                /** @description Relative path within archive */
                entrypoint: string;
                /** @enum {string} */
                template: "react-static-v1";
                requestedDatasetVersionIds: string[];
            };
            collections: components["schemas"]["CollectionDefinition"][];
        };
        AppVersion: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            version: number;
            /** Format: uuid */
            appId: string;
            sourceDigest: string;
            /** @description Immutable managed artifact key */
            sourceArtifactKey: string;
            manifest: {
                /** @description Relative path within archive */
                entrypoint: string;
                /** @enum {string} */
                template: "react-static-v1";
                requestedDatasetVersionIds: string[];
            };
            reportVersionIds: string[];
            collections: components["schemas"]["CollectionDefinition"][];
        };
        BuildJob: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            appVersionId: string;
            /** @enum {string} */
            status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
            artifactDigest: string | null;
            templateDigest: string;
            lockDigest: string;
            /** @enum {string} */
            scanStatus: "pending" | "passed" | "blocked";
            attestationRef: string | null;
            failureCode: string | null;
        };
        CreateBuild: {
            /** @enum {string} */
            template: "react-static-v1";
        };
        ArtifactUpload: {
            /** @description Base file name */
            fileName: string;
            sizeBytes: number;
            digest: string;
        };
        UploadTicket: {
            /** @description Server allocated organization-scoped key */
            artifactKey: string;
            /** @description Same-origin PUT path, no arbitrary external host */
            uploadPath: string;
            /** Format: date-time */
            expiresAt: string;
        };
        LogicalDataSource: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            key: string;
            name: string;
            systemCode: string;
            /** @enum {string} */
            engine: "postgresql" | "mysql" | "sqlserver";
            description: string;
            department: string;
            /** Format: uuid */
            ownerUserId: string;
            /** @enum {string} */
            sensitivity: "public" | "internal" | "sensitive" | "restricted";
            /** @enum {string} */
            status: "enabled" | "disabled";
            revision: number;
            /** Format: date-time */
            updatedAt: string;
            ownerDisplayName?: string;
        };
        CreateLogicalDataSource: {
            key: string;
            name: string;
            systemCode: string;
            /** @enum {string} */
            engine: "postgresql" | "mysql" | "sqlserver";
            description: string;
            department: string;
            /** Format: uuid */
            ownerUserId: string;
            /** @enum {string} */
            sensitivity: "public" | "internal" | "sensitive" | "restricted";
            /** @enum {string} */
            status: "enabled" | "disabled";
        };
        PhysicalConnection: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            name: string;
            /** @enum {string} */
            environment: "test" | "production";
            /** @enum {string} */
            engine: "postgresql" | "mysql" | "sqlserver";
            /** Format: uuid */
            endpointId: string;
            host: string;
            port: number;
            databaseName: string;
            /** Format: uuid */
            credentialProfileId: string;
            credentialRevision: number;
            /** @enum {string} */
            status: "active" | "disabled";
            revision: number;
            connectTimeoutMs: number;
            requestTimeoutMs: number;
            poolMax: number;
            metadataScope: components["schemas"]["RelationRef"][];
            /** @enum {string} */
            lastHealthStatus: "unknown" | "healthy" | "unhealthy";
            lastCheckedAt: string | null;
            /** Format: date-time */
            updatedAt: string;
        };
        CreatePhysicalConnection: {
            name: string;
            /** @enum {string} */
            environment: "test" | "production";
            /** @enum {string} */
            engine: "postgresql" | "mysql" | "sqlserver";
            /** Format: uuid */
            endpointId: string;
            databaseName: string;
            /** Format: uuid */
            credentialProfileId: string;
            connectTimeoutMs: number;
            requestTimeoutMs: number;
            poolMax: number;
            metadataScope: components["schemas"]["RelationRef"][];
        };
        RotateCredential: {
            /** @description Vault reference; accepted only from trusted data administrators */
            secretRef: string;
        };
        ConnectionTest: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            physicalConnectionId: string;
            /** @enum {string} */
            status: "queued" | "running" | "succeeded" | "failed";
            failureCode: string | null;
        };
        SourceMapping: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            logicalDataSourceId: string;
            /** @enum {string} */
            environment: "test" | "production";
            /** Format: uuid */
            physicalConnectionId: string;
            revision: number;
            schemaDigest: string;
        };
        SetSourceMapping: {
            /** Format: uuid */
            physicalConnectionId: string;
        };
        Dataset: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            key: string;
            name: string;
            /** Format: uuid */
            logicalDataSourceId: string;
            description: string;
            /** @enum {string} */
            status: "draft" | "enabled" | "disabled";
            revision: number;
            /** Format: date-time */
            updatedAt: string;
            /** @description Effective current-user TEST preview capability; rechecked on execution. */
            canPreview?: boolean;
        };
        CreateDataset: {
            key: string;
            name: string;
            /** Format: uuid */
            logicalDataSourceId: string;
            description: string;
        };
        DatasetField: {
            key: string;
            name: string;
            physicalColumn: string;
            /** @enum {string} */
            dataType: "string" | "number" | "integer" | "boolean" | "date" | "datetime";
            /** @enum {string} */
            classification: "public" | "internal" | "sensitive";
            filterable: boolean;
            isDimension: boolean;
            description: string;
        };
        MetricDefinition: {
            key: string;
            name: string;
            /** @enum {string} */
            aggregate: "count" | "countDistinct" | "sum" | "avg" | "min" | "max";
            fieldKey: string;
            businessDefinition: string;
            description: string;
            filters: components["schemas"]["Filter"][];
            availableDimensions: string[];
        };
        CreateDatasetVersion: {
            /** Format: uuid */
            metadataSnapshotId: string;
            relation: components["schemas"]["RelationRef"];
            fields: components["schemas"]["DatasetField"][];
            metrics: components["schemas"]["MetricDefinition"][];
            relationships: components["schemas"]["DatasetRelationship"][];
        };
        DatasetVersion: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            datasetId: string;
            version: number;
            /** Format: uuid */
            metadataSnapshotId: string;
            relation: components["schemas"]["RelationRef"];
            fields: components["schemas"]["DatasetField"][];
            metrics: components["schemas"]["MetricDefinition"][];
            relationships: components["schemas"]["DatasetRelationship"][];
            rowPolicyKey: string;
            schemaDigest: string;
        };
        Report: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            appId: string;
            key: string;
            name: string;
            revision: number;
        };
        CreateReport: {
            /** Format: uuid */
            appId: string;
            key: string;
            name: string;
        };
        Filter: {
            fieldKey: string;
            /** @enum {string} */
            operator: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in" | "between";
            value: string | number | boolean | (string | number | boolean)[];
        };
        QuerySpec: {
            /** Format: uuid */
            datasetId: string;
            /** Format: uuid */
            datasetVersionId?: string;
            metrics: string[];
            dimensions: string[];
            filters: components["schemas"]["Filter"][];
            groupBy: string[];
            orderBy: {
                key: string;
                /** @enum {string} */
                direction: "asc" | "desc";
            }[];
            /** @description Optional caller-requested result row count. No preset platform row ceiling; omit to avoid a row limit, or use pagination for incremental retrieval. */
            limit?: number;
            pagination?: {
                pageSize: number;
                cursor?: string;
            };
            timeRange?: {
                fieldKey: string;
                /** Format: date-time */
                from: string;
                /** Format: date-time */
                to: string;
            };
        };
        ReportQuery: {
            key: string;
            /** Format: uuid */
            datasetVersionId: string;
            dimensions: string[];
            metrics: string[];
            allowedFilterKeys: string[];
        };
        ChartSpec: {
            key: string;
            queryKey: string;
            /** @enum {string} */
            type: "table" | "bar" | "line" | "pie" | "stat";
            title: string;
            xField?: string;
            yFields?: string[];
        };
        CreateReportVersion: {
            queries: components["schemas"]["ReportQuery"][];
            charts: components["schemas"]["ChartSpec"][];
        };
        ReportVersion: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            version: number;
            /** Format: uuid */
            reportId: string;
            configDigest: string;
            queries: components["schemas"]["ReportQuery"][];
            charts: components["schemas"]["ChartSpec"][];
        };
        CreateTestQuery: {
            query: components["schemas"]["QuerySpec"];
        };
        CreateRuntimeQuery: {
            query: components["schemas"]["QuerySpec"];
        };
        CreateReportQuery: {
            queryKey: string;
            filters: components["schemas"]["Filter"][];
        };
        QueryJob: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** @enum {string} */
            environment: "test" | "production";
            /** Format: uuid */
            datasetId: string;
            /** Format: uuid */
            traceId: string;
            /** @enum {string} */
            purpose: "query" | "export";
            /** @enum {string} */
            status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
            /** Format: date-time */
            expiresAt: string;
            durationMs: number | null;
            rowCount: number;
            result: components["schemas"]["QueryResult"] | null;
            failureCode: string | null;
            truncated: boolean;
            /** @description Server-derived production deployment/release association; null for TEST. */
            deploymentId?: string | null;
            /** @description Server-derived production deployment/release association; null for TEST. */
            releaseRequestId?: string | null;
        };
        QueryResult: {
            columns: {
                key: string;
                /** @enum {string} */
                dataType: "string" | "number" | "integer" | "boolean" | "date" | "datetime";
                masked: boolean;
            }[];
            rows: (string | number | boolean | null)[][];
            truncated: boolean;
            nextCursor: string | null;
        };
        ReleaseScope: {
            /** Format: uuid */
            datasetVersionId: string;
            /** Format: uuid */
            mappingId: string;
            fieldKeys: string[];
            metricKeys: string[];
            /** @description Immutable row-policy identifier */
            rowPolicyKey: string;
            maxRows: number;
            maxDurationMs: number;
        };
        CreateReleaseRequest: {
            /** Format: uuid */
            appVersionId: string;
            /** Format: uuid */
            buildJobId: string;
            /** @description Business release reason */
            reason: string;
            scopes: components["schemas"]["ReleaseScope"][];
            audienceUserIds: string[];
        };
        ReleaseRequest: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            appId: string;
            /** Format: uuid */
            appVersionId: string;
            /** Format: uuid */
            buildJobId: string;
            /** @enum {string} */
            kind: "publish" | "rollback";
            /** @enum {string} */
            targetEnvironment: "production";
            /** @enum {string} */
            status: "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "expired";
            revision: number;
            snapshotDigest: string;
            /** Format: uuid */
            requesterUserId: string;
            /** Format: date-time */
            expiresAt: string;
            scopes: components["schemas"]["ReleaseScope"][];
            audienceUserIds: string[];
        };
        ApprovalRecord: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            releaseRequestId: string;
            /** Format: uuid */
            approverUserId: string;
            /** @enum {string} */
            decision: "approve" | "reject";
            /** @description Review comment */
            comment: string;
            snapshotDigest: string;
        };
        CreateApproval: {
            /** @enum {string} */
            decision: "approve" | "reject";
            /** @description Review comment */
            comment: string;
        };
        Deployment: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            appId: string;
            /** Format: uuid */
            appVersionId: string;
            /** Format: uuid */
            releaseRequestId: string;
            /** @enum {string} */
            environment: "production";
            /** @enum {string} */
            status: "queued" | "validating" | "deploying" | "active" | "superseded" | "failed";
            artifactDigest: string;
            /** Format: uuid */
            previousDeploymentId: string | null;
            failureCode: string | null;
        };
        CreateRollbackRequest: {
            /** Format: uuid */
            targetDeploymentId: string;
            /** @description Rollback reason */
            reason: string;
        };
        RuntimeContext: {
            /** Format: uuid */
            appId: string;
            /** Format: uuid */
            deploymentId: string;
            /** Format: uuid */
            appVersionId: string;
            reportVersionIds: string[];
            policyEpoch: number;
        };
        RevokeRuntimeGrant: {
            /** @description Revocation reason */
            reason: string;
        };
        RuntimeGrant: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            deploymentId: string;
            /** Format: uuid */
            datasetVersionId: string;
            /** Format: uuid */
            mappingId: string;
            /** @enum {string} */
            status: "active" | "revoked";
            policyEpoch: number;
            /** Format: date-time */
            expiresAt: string;
        };
        AuditLog: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            actorUserId: string | null;
            /** @description Action key */
            action: string;
            /** Format: uuid */
            resourceId: string | null;
            /** @enum {string} */
            outcome: "allow" | "deny" | "error";
            /** @description Trace identifier */
            requestId: string;
            /** Format: date-time */
            createdAt: string;
        };
        OrganizationPage: {
            items: components["schemas"]["Organization"][];
            nextCursor: string | null;
        };
        OrganizationMemberPage: {
            items: components["schemas"]["OrganizationMember"][];
            nextCursor: string | null;
        };
        RolePage: {
            items: components["schemas"]["Role"][];
            nextCursor: string | null;
        };
        ResourceGrantPage: {
            items: components["schemas"]["ResourceGrant"][];
            nextCursor: string | null;
        };
        AppPage: {
            items: components["schemas"]["App"][];
            nextCursor: string | null;
        };
        LogicalDataSourcePage: {
            items: components["schemas"]["LogicalDataSource"][];
            nextCursor: string | null;
        };
        PhysicalConnectionPage: {
            items: components["schemas"]["PhysicalConnection"][];
            nextCursor: string | null;
        };
        DatasetPage: {
            items: components["schemas"]["Dataset"][];
            nextCursor: string | null;
        };
        ReportPage: {
            items: components["schemas"]["Report"][];
            nextCursor: string | null;
        };
        ReleaseRequestPage: {
            items: components["schemas"]["ReleaseRequest"][];
            nextCursor: string | null;
        };
        PermissionPage: {
            items: components["schemas"]["Permission"][];
            nextCursor: string | null;
        };
        AppVersionPage: {
            items: components["schemas"]["AppVersion"][];
            nextCursor: string | null;
        };
        SourceMappingPage: {
            items: components["schemas"]["SourceMapping"][];
            nextCursor: string | null;
        };
        DatasetVersionPage: {
            items: components["schemas"]["DatasetVersion"][];
            nextCursor: string | null;
        };
        ReportVersionPage: {
            items: components["schemas"]["ReportVersion"][];
            nextCursor: string | null;
        };
        ApprovalRecordPage: {
            items: components["schemas"]["ApprovalRecord"][];
            nextCursor: string | null;
        };
        RuntimeGrantPage: {
            items: components["schemas"]["RuntimeGrant"][];
            nextCursor: string | null;
        };
        AuditLogPage: {
            items: components["schemas"]["AuditLog"][];
            nextCursor: string | null;
        };
        CollectionDefinition: {
            key: string;
            /** @description Bounded JSON Schema subset; no remote $ref, code, templates or arbitrary formats. */
            schema: {
                [key: string]: unknown;
            };
            /** @enum {string} */
            rowPolicy: "owner" | "organization";
            allowedActions: ("create" | "read" | "update" | "delete")[];
        };
        AppRecord: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            collectionKey: string;
            /** Format: uuid */
            ownerUserId: string;
            /** @enum {string} */
            environment: "test" | "production";
            revision: number;
            /** @description Validated against collection schema pinned by active app version. */
            data: {
                [key: string]: unknown;
            };
            /** Format: date-time */
            updatedAt: string;
        };
        WriteAppRecord: {
            /** @description Validated against collection schema pinned by active app version. */
            data: {
                [key: string]: unknown;
            };
        };
        AppRecordPage: {
            items: components["schemas"]["AppRecord"][];
            nextCursor: string | null;
        };
        RelationRef: {
            schema: string;
            name: string;
        };
        UpdateLogicalDataSource: {
            name: string;
            systemCode: string;
            description: string;
            department: string;
            /** Format: uuid */
            ownerUserId: string;
            /** @enum {string} */
            sensitivity: "public" | "internal" | "sensitive" | "restricted";
            /** @enum {string} */
            status: "enabled" | "disabled";
        };
        NetworkEndpoint: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            name: string;
            /** @enum {string} */
            environment: "test" | "production";
            /** @enum {string} */
            engine: "postgresql" | "mysql" | "sqlserver";
            host: string;
            port: number;
            allowedCidrs: string[];
            tlsServerName: string;
            /** @enum {string} */
            tlsMode: "verify-full" | "disable-fixture";
            allowedDatabases: string[];
            allowedRelations: components["schemas"]["RelationRef"][];
            localFixture: boolean;
        };
        CredentialProfile: {
            /** Format: uuid */
            id: string;
            label: string;
            /** @enum {string} */
            environment: "test" | "production";
            /** @enum {string} */
            engine: "postgresql" | "mysql" | "sqlserver";
            endpointIds: string[];
        };
        UpdatePhysicalConnection: {
            name: string;
            /** @enum {string} */
            status: "active" | "disabled";
            connectTimeoutMs: number;
            requestTimeoutMs: number;
            poolMax: number;
        };
        ColumnMetadata: {
            name: string;
            dbType: string;
            nullable: boolean;
            ordinal: number;
            comment: string;
            primaryKey: boolean;
        };
        ForeignKeyMetadata: {
            name: string;
            columns: string[];
            referencedSchema: string;
            referencedRelation: string;
            referencedColumns: string[];
        };
        IndexMetadata: {
            name: string;
            unique: boolean;
            primary: boolean;
            columns: string[];
        };
        RelationMetadata: {
            schema: string;
            name: string;
            /** @enum {string} */
            kind: "table" | "view";
            comment: string;
            columns: components["schemas"]["ColumnMetadata"][];
            primaryKey: string[];
            foreignKeys: components["schemas"]["ForeignKeyMetadata"][];
            indexes: components["schemas"]["IndexMetadata"][];
        };
        MetadataSnapshot: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            physicalConnectionId: string;
            /** Format: uuid */
            jobId: string;
            schemaDigest: string;
            relations: components["schemas"]["RelationMetadata"][];
        };
        CreateMetadataSync: {
            relations: components["schemas"]["RelationRef"][];
        };
        PreviewResult: {
            columns: {
                key: string;
                dataType: string;
            }[];
            rows: (string | number | boolean | null)[][];
            truncated: boolean;
        };
        CatalogJob: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** @enum {string} */
            operation: "health" | "metadata" | "preview";
            /** @enum {string} */
            environment: "test" | "production";
            /** Format: uuid */
            physicalConnectionId: string;
            datasetVersionId: string | null;
            /** @enum {string} */
            status: "queued" | "running" | "succeeded" | "failed";
            attempt: number;
            retryOf: string | null;
            failureCode: string | null;
            result: ({
                healthy: boolean;
                /** Format: date-time */
                checkedAt: string;
            } | {
                /** Format: uuid */
                metadataSnapshotId: string;
            } | components["schemas"]["PreviewResult"]) | null;
            completedAt: string | null;
        };
        UpdateDataset: {
            name: string;
            description: string;
            /** @enum {string} */
            status: "draft" | "enabled" | "disabled";
        };
        DatasetRelationship: {
            key: string;
            /** Format: uuid */
            targetDatasetVersionId: string;
            sourceFieldKey: string;
            targetFieldKey: string;
            /** @enum {string} */
            cardinality: "one-to-one" | "one-to-many" | "many-to-one";
            description: string;
        };
        CreateDatasetPreview: {
            /** Format: uuid */
            datasetVersionId: string;
            dimensions: string[];
            metrics: string[];
            filters: components["schemas"]["Filter"][];
            limit: number;
        };
        DatasetGrant: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            principalUserId: string;
            /** Format: uuid */
            resourceId: string;
            /** @enum {string} */
            action: "dataset.read" | "dataset.query.test" | "source.read" | "dataset.query.production" | "dataset.export" | "dataset.unmask" | "app.view" | "report.view";
            /** Format: date-time */
            expiresAt: string;
            fieldKeys: string[];
            metricKeys: string[];
        };
        CreateDatasetGrant: {
            /** Format: uuid */
            principalUserId: string;
            /** @enum {string} */
            action: "dataset.read" | "dataset.query.test" | "source.read" | "dataset.query.production" | "dataset.export" | "dataset.unmask" | "app.view" | "report.view";
            /** Format: date-time */
            expiresAt: string;
            fieldKeys: string[];
            metricKeys: string[];
        };
        CurrentUser: {
            /** Format: uuid */
            id: string;
            displayName: string;
            /** @enum {string} */
            status: "active" | "disabled";
            organizations: {
                /** Format: uuid */
                id: string;
                name: string;
            }[];
            organizationId: string | null;
            permissions: string[];
            /** @enum {string} */
            clientKind: "human" | "ai";
        };
        AdapterStatus: {
            /** @enum {string} */
            engine: "postgresql" | "mysql" | "sqlserver";
            /** @enum {string} */
            status: "verified-real" | "implemented-unverified";
            driver: string;
            notes: string;
        };
        NetworkEndpointPage: {
            items: components["schemas"]["NetworkEndpoint"][];
            nextCursor: string | null;
        };
        CredentialProfilePage: {
            items: components["schemas"]["CredentialProfile"][];
            nextCursor: string | null;
        };
        AdapterStatusPage: {
            items: components["schemas"]["AdapterStatus"][];
            nextCursor: string | null;
        };
        MetadataSnapshotPage: {
            items: components["schemas"]["MetadataSnapshot"][];
            nextCursor: string | null;
        };
        DatasetGrantPage: {
            items: components["schemas"]["DatasetGrant"][];
            nextCursor: string | null;
        };
        QueryPolicyInput: {
            /** Format: uuid */
            datasetVersionId: string;
            organizationFieldKey: string | null;
            dedicatedSource: boolean;
            departmentFieldKey: string | null;
            userFieldKey: string | null;
            fixedFilters: components["schemas"]["Filter"][];
            masks: {
                fieldKey: string;
                /** @enum {string} */
                mode: "redact" | "last4";
            }[];
            requireDatabaseRls: boolean;
            /**
             * @deprecated
             * @description Legacy field retained for compatibility. Does not cap TEST result rows or block source commits.
             */
            maxRows?: number;
            /**
             * @deprecated
             * @description Legacy field retained for compatibility. Does not cap TEST result rows or block source commits.
             */
            maxExportRows?: number;
            timeoutMs: number;
            maxCost: number;
            maxScanRows: number;
            slowQueryMs: number;
        };
        QueryPolicy: {
            /** Format: uuid */
            datasetVersionId: string;
            organizationFieldKey: string | null;
            dedicatedSource: boolean;
            departmentFieldKey: string | null;
            userFieldKey: string | null;
            fixedFilters: components["schemas"]["Filter"][];
            masks: {
                fieldKey: string;
                /** @enum {string} */
                mode: "redact" | "last4";
            }[];
            requireDatabaseRls: boolean;
            /**
             * @deprecated
             * @description Legacy field retained for compatibility. Does not cap TEST result rows or block source commits.
             */
            maxRows?: number;
            /**
             * @deprecated
             * @description Legacy field retained for compatibility. Does not cap TEST result rows or block source commits.
             */
            maxExportRows?: number;
            timeoutMs: number;
            maxCost: number;
            maxScanRows: number;
            slowQueryMs: number;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            datasetId: string;
            revision: number;
            digest: string;
            /** Format: date-time */
            createdAt: string;
        };
        QueryValidation: {
            /** @constant */
            valid: true;
            /** @enum {string} */
            environment: "test" | "production";
            /** Format: uuid */
            datasetVersionId: string;
            policyRevision: number;
            /** @description Effective caller-requested row count; null means the TEST request has no row ceiling. Production remains bounded by its approved release scope. */
            maxRows: number | null;
            timeoutMs: number;
            maskedFieldKeys: string[];
            /** Format: uuid */
            traceId: string;
        };
        MemberDataScope: {
            departmentCodes: string[];
        };
        QueryAudit: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            userId: string;
            jobId: string | null;
            appId: string | null;
            reportId: string | null;
            datasetId: string | null;
            /** @enum {string} */
            environment: "test" | "production";
            durationMs: number;
            rowCount: number;
            status: string;
            /** @enum {string} */
            permissionResult: "allow" | "deny";
            /** Format: uuid */
            traceId: string;
            slow: boolean;
            /** Format: date-time */
            createdAt: string;
            /** @description Server-derived production deployment/release association; null for TEST. */
            deploymentId?: string | null;
            /** @description Server-derived production deployment/release association; null for TEST. */
            releaseRequestId?: string | null;
        };
        DatasetRef: {
            /** Format: uuid */
            datasetId: string;
            /** Format: uuid */
            datasetVersionId: string;
        };
        BoundQuery: {
            key: string;
            query: components["schemas"]["QuerySpec"];
        };
        ChartDefinition: {
            id: string;
            title: string;
            /** @enum {unknown} */
            type: "metric" | "table" | "bar" | "line" | "pie" | "ranking";
            queryKey: string;
            categoryKey?: string;
            valueKey: string;
            /** @enum {unknown} */
            format: "number" | "currency" | "percent";
            span: number;
        };
        ReportDefinition: {
            /** @constant */
            schemaVersion: "1.0";
            /** Format: uuid */
            reportId: string;
            title: string;
            datasetRefs: components["schemas"]["DatasetRef"][];
            metrics: string[];
            dimensions: string[];
            filters: {
                key: string;
                label: string;
                fieldKey: string;
                /** @enum {unknown} */
                type: "dateRange" | "select";
                options: string[];
            }[];
            queries: components["schemas"]["BoundQuery"][];
            chartDefinitions: components["schemas"]["ChartDefinition"][];
            layout: {
                /** @constant */
                columns: 12;
                /** @enum {unknown} */
                gap: 16 | 20 | 24;
            };
            /** @enum {unknown} */
            theme: "studio-light" | "studio-dark";
            refreshPolicy: {
                /** @enum {unknown} */
                mode: "manual" | "interval";
                intervalSeconds: number;
            };
            notes: string[];
        };
        SourceManifest: {
            /** @constant */
            schemaVersion: "1.0";
            /** @constant */
            entrypoint: "src/main.tsx";
            datasetRefs: components["schemas"]["DatasetRef"][];
            queries: components["schemas"]["BoundQuery"][];
            report?: components["schemas"]["ReportDefinition"];
            /** @description Explicit platform-managed business capabilities required by this immutable version. */
            capabilities?: "student-center"[];
            runtime?: {
                /** @constant */
                kind: "node24-http-v1";
                entrypoint: string;
                dataSource: string;
            };
        };
        SourceUpload: {
            manifest: components["schemas"]["SourceManifest"];
            files: {
                path: string;
                content: string;
            }[];
            message: string;
        };
        StudioAppCreate: {
            key: string;
            name: string;
            /** @enum {unknown} */
            type: "REPORT" | "SITE";
            description: string;
            datasetRefs: components["schemas"]["DatasetRef"][];
            workspaceId: string;
        };
        StudioApp: {
            /** Format: uuid */
            id: string;
            key: string;
            name: string;
            /** @enum {unknown} */
            type: "REPORT" | "SITE";
            description: string;
            workspaceId: string;
            /** Format: uuid */
            ownerUserId: string;
            revision: number;
            /** Format: date-time */
            createdAt: string;
            /** @enum {string} */
            sharingVisibility: "private" | "organization" | "public";
        };
        StudioVersion: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            appId: string;
            version: number;
            sourceDigest: string;
            manifest: components["schemas"]["SourceManifest"];
            message: string;
            /** Format: uuid */
            restoredFrom: string | null;
            /** Format: date-time */
            createdAt: string;
            changes: string[];
            /** @description 此源码版本的最近构建；null表示从未构建。 */
            latestBuild?: components["schemas"]["StudioBuild"] | null;
            /**
             * Format: uuid
             * @description 此源码版本已有封存产物的成功构建ID；没有则为null。
             */
            successfulBuildId?: string | null;
        };
        StudioBuild: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            appVersionId: string;
            /** @enum {unknown} */
            status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
            failureCode: string | null;
            /** Format: date-time */
            createdAt: string;
            logs: string[];
        };
        StudioPreview: {
            /** Format: uuid */
            appId: string;
            /** Format: uuid */
            versionId: string;
            /** Format: uuid */
            buildId: string;
            /** @enum {string} */
            environment: "test" | "production";
            html: string;
            manifest: components["schemas"]["SourceManifest"];
        };
        StudioQuery: {
            queryKey: string;
            filters: components["schemas"]["Filter"][];
            /** @description Optional runtime date range. The bound query in SourceManifest must declare timeRange with the same fieldKey; a missing or mismatched binding returns INVALID_FILTER_BINDING with error.details. */
            timeRange?: {
                fieldKey: string;
                /** Format: date-time */
                from: string;
                /** Format: date-time */
                to: string;
            };
        };
        RestoreVersion: {
            /** Format: uuid */
            versionId: string;
            message: string;
        };
        StudioReportCreate: {
            /** Format: uuid */
            appId: string;
            key: string;
            name: string;
        };
        StudioReport: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            appId: string;
            key: string;
            name: string;
            revision: number;
        };
        StudioReportVersion: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            reportId: string;
            version: number;
            config: components["schemas"]["ReportDefinition"];
            configDigest: string;
            /** Format: date-time */
            createdAt: string;
        };
        SaveReportVersion: {
            config: components["schemas"]["ReportDefinition"];
        };
        StudioReleaseState: {
            /** @constant */
            enabled: false;
            /** @constant */
            code: "RELEASE_WORKFLOW_NOT_ENABLED";
            message: string;
        };
        StudioCapabilities: {
            /** @constant */
            sourceUpload: true;
            /** @constant */
            buildProfile: "react-static-v1";
            productionEnabled: boolean;
            releaseEnabled: boolean;
            /** @constant */
            modelGeneration: "harness";
            maxSourceBytes: number;
            /** @constant */
            serverWorkspace: true;
            remoteDebug?: boolean;
            siteBackend?: boolean;
            buildProfiles?: ("react-static-v1" | "site-fullstack-v1")[];
        };
        StudioAppPage: {
            items: components["schemas"]["StudioApp"][];
            nextCursor: string | null;
        };
        StudioVersionPage: {
            items: components["schemas"]["StudioVersion"][];
            nextCursor: string | null;
        };
        StudioBuildPage: {
            items: components["schemas"]["StudioBuild"][];
            nextCursor: string | null;
        };
        StudioReportPage: {
            items: components["schemas"]["StudioReport"][];
            nextCursor: string | null;
        };
        StudioReportVersionPage: {
            items: components["schemas"]["StudioReportVersion"][];
            nextCursor: string | null;
        };
        SiteSharing: {
            /** Format: uuid */
            appId: string;
            /** Format: uuid */
            shareId: string | null;
            /** @enum {string} */
            visibility: "private" | "organization" | "public";
            revision: number;
            /** Format: uuid */
            appVersionId: string | null;
            /** Format: uuid */
            buildId: string | null;
            /** Format: uuid */
            suggestedVersionId: string | null;
            sharePath: string | null;
            /** @constant */
            environment: "test";
            canManage: boolean;
        };
        UpdateSiteSharing: {
            /** @enum {string} */
            visibility: "private" | "organization" | "public";
            /** Format: uuid */
            appVersionId: string;
            expectedRevision: number;
        };
        SharedSite: {
            /** Format: uuid */
            shareId: string;
            title: string;
            /** @enum {string} */
            visibility: "private" | "organization" | "public";
            revision: number;
            preview: components["schemas"]["StudioPreview"];
        };
        PersonalToken: {
            /** Format: uuid */
            id: string;
            name: string;
            /** @enum {string} */
            scope: "read" | "develop";
            hint: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            expiresAt: string;
            /** Format: date-time */
            revokedAt: string | null;
        };
        CreatePersonalToken: {
            name: string;
            /** @enum {string} */
            scope: "read" | "develop";
            expiresInDays: number;
        };
        CreatedPersonalToken: {
            token: string;
            metadata: components["schemas"]["PersonalToken"];
        };
        PersonalTokenPage: {
            items: components["schemas"]["PersonalToken"][];
            nextCursor: null;
        };
        PasswordLogin: {
            username: string;
            password: string;
        };
        PasswordRegistration: {
            username: string;
            password: string;
            displayName: string;
            invitationCode?: string;
            /**
             * Format: uuid
             * @description Required for direct registration; server verifies current organization policy.
             */
            organizationId?: string;
        } & (unknown | unknown);
        PasswordChange: {
            currentPassword: string;
            newPassword: string;
        };
        AuthOptions: {
            passwordEnabled: boolean;
            /** @enum {string} */
            registration: "invitation" | "open";
            /** @constant */
            minPasswordLength: 12;
            openOrganizations: components["schemas"]["RegistrationOrganization"][];
        };
        BrowserSession: {
            user: components["schemas"]["CurrentUser"];
            csrfToken: string;
            mustChangePassword: boolean;
        };
        AuthMessage: {
            message: string;
        };
        RegistrationInvitation: {
            /** Format: uuid */
            id: string;
            label: string;
            /** @enum {string} */
            role: "viewer" | "developer";
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            expiresAt: string;
            /** Format: date-time */
            revokedAt: string | null;
            /** Format: date-time */
            usedAt: string | null;
        };
        CreateRegistrationInvitation: {
            label: string;
            /** @enum {string} */
            role: "viewer" | "developer";
            expiresInDays: number;
        };
        CreatedRegistrationInvitation: {
            code: string;
            invitation: components["schemas"]["RegistrationInvitation"];
        };
        RegistrationInvitationPage: {
            items: components["schemas"]["RegistrationInvitation"][];
            nextCursor: null;
        };
        ServerWorkspace: {
            /** Format: uuid */
            appId: string;
            revision: number;
            baseVersionId: string | null;
            updatedAt: string | null;
            files: {
                path: string;
                bytes: number;
                digest: string;
            }[];
        };
        ServerWorkspaceFile: {
            path: string;
            content: string;
            revision: number;
            digest: string;
        };
        ReadServerWorkspaceFile: {
            path: string;
        };
        WriteServerWorkspace: {
            revision: number;
            files: {
                path: string;
                content: string;
            }[];
        };
        EditServerWorkspace: {
            revision: number;
            path: string;
            oldText: string;
            newText: string;
            replaceAll?: boolean;
        };
        RemoveServerWorkspaceFiles: {
            revision: number;
            paths: string[];
        };
        MoveServerWorkspaceFile: {
            revision: number;
            from: string;
            to: string;
        };
        CheckoutServerWorkspace: {
            revision: number;
            /** Format: uuid */
            versionId: string;
        };
        CommitServerWorkspace: {
            revision: number;
            message: string;
        };
        ServerWorkspaceCommit: {
            version: components["schemas"]["StudioVersion"];
            workspace: components["schemas"]["ServerWorkspace"];
        };
        CreateNetworkEndpoint: {
            name: string;
            /** @enum {unknown} */
            environment: "test" | "production";
            /** @enum {unknown} */
            engine: "postgresql" | "mysql" | "sqlserver";
            host: string;
            port: number;
            allowedAddresses: string[];
            tlsServerName: string;
            allowedDatabases: string[];
            allowedRelations: components["schemas"]["RelationRef"][];
            caRef?: string;
            /** Format: uuid */
            credentialProfileId?: string;
        };
        CreatedNetworkEndpoint: {
            endpoint: components["schemas"]["NetworkEndpoint"];
            credentialProfile: components["schemas"]["CredentialProfile"] | null;
        };
        ConfigurePhysicalConnection: {
            name: string;
            /** @enum {unknown} */
            environment: "test" | "production";
            /** @enum {unknown} */
            engine: "postgresql" | "mysql" | "sqlserver";
            host: string;
            port: number;
            databaseName: string;
            username: string;
            /** Format: password */
            password: string;
            /** @enum {unknown} */
            tlsMode: "verify-full" | "disable-local-test";
            tlsServerName?: string;
            caRef?: string;
            metadataScope: components["schemas"]["RelationRef"][];
            connectTimeoutMs: number;
            requestTimeoutMs: number;
            poolMax: number;
        };
        ReleaseStep: {
            roleKey: string;
            label: string;
            /** Format: uuid */
            approverUserId: string;
        };
        ReleasePolicy: {
            revision: number;
            steps: components["schemas"]["ReleaseStep"][];
        };
        SetReleasePolicy: {
            steps: components["schemas"]["ReleaseStep"][];
        };
        RequestedReleaseScope: {
            /** Format: uuid */
            datasetVersionId: string;
            fieldKeys: string[];
            metricKeys: string[];
            sensitiveFieldKeys: string[];
            maxRows?: number | null;
        };
        Stage06CreateRelease: {
            /** Format: uuid */
            appVersionId: string;
            /** Format: uuid */
            buildJobId: string;
            reason: string;
            testResults: string;
            targetDepartments: string[];
            audienceUserIds: string[];
            scopes: components["schemas"]["RequestedReleaseScope"][];
            /** @description 申请页选择的顺序审批人。服务端校验当前组织和审批权限；实际审核身份始终取当前登录会话。省略时仅为兼容旧客户端读取应用默认流程。 */
            approvalSteps?: components["schemas"]["ReleaseStep"][];
        };
        Stage06Approval: {
            /** @enum {string} */
            decision: "approve" | "reject";
            comment: string;
            stepIndex: number;
        };
        Stage06Rollback: {
            /** Format: uuid */
            targetDeploymentId: string;
            reason: string;
            testResults: string;
            /** @description 申请页选择的顺序审批人。服务端校验当前组织和审批权限；实际审核身份始终取当前登录会话。省略时仅为兼容旧客户端读取应用默认流程。 */
            approvalSteps?: components["schemas"]["ReleaseStep"][];
        };
        ReleaseEvent: {
            /** Format: uuid */
            id: string;
            event: string;
            /** Format: uuid */
            actorUserId: string;
            /** Format: uuid */
            traceId: string;
            /** Format: date-time */
            createdAt: string;
            deploymentId: string | null;
            detail: {
                [key: string]: unknown;
            };
        };
        ReleaseApproval: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            approverUserId: string;
            roleKey: string | null;
            stepIndex: number | null;
            decision: string;
            comment: string;
            /** Format: date-time */
            createdAt: string;
        };
        Stage06Deployment: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            appId: string;
            /** Format: uuid */
            appVersionId: string;
            /** Format: uuid */
            releaseRequestId: string;
            status: string;
            phase: string;
            attempt: number;
            failureCode: string | null;
            traceId: string | null;
            /** Format: date-time */
            createdAt: string;
            events: components["schemas"]["ReleaseEvent"][];
        };
        Stage06Release: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            appId: string;
            appName: string;
            /** Format: uuid */
            appVersionId: string;
            version: number;
            /** Format: uuid */
            buildJobId: string;
            kind: string;
            status: string;
            revision: number;
            currentStep: number;
            /** Format: uuid */
            requesterUserId: string;
            reason: string;
            testResults: string;
            targetDepartments: string[];
            sourceDigest: string;
            snapshotDigest: string;
            manifest: {
                [key: string]: unknown;
            };
            steps: components["schemas"]["ReleaseStep"][];
            approvals: components["schemas"]["ReleaseApproval"][];
            events: components["schemas"]["ReleaseEvent"][];
            deployment: components["schemas"]["Stage06Deployment"] | null;
            /** Format: date-time */
            createdAt: string;
        };
        Stage06ReleasePage: {
            items: components["schemas"]["Stage06Release"][];
        };
        Stage06DeploymentPage: {
            items: components["schemas"]["Stage06Deployment"][];
        };
        ReleaseMember: {
            /** Format: uuid */
            userId: string;
            displayName: string;
            departmentCodes: string[];
            canApprove: boolean;
        };
        ReleaseOptions: {
            members: components["schemas"]["ReleaseMember"][];
            apps: components["schemas"]["StudioApp"][];
            deploymentWorkerConfigured: boolean;
            productionConnectorConfigured: boolean;
        };
        /** @description 构建按钮的无参数命令。可以省略请求体或提交空JSON对象，不能传入执行命令、环境或连接参数。 */
        StudioBuildCommand: Record<string, never>;
        StudioDebugOpen: {
            /** Format: uuid */
            versionId: string;
            viewport?: {
                width: number;
                height: number;
            };
        };
        StudioDebugAction: {
            /** @constant */
            type: "click";
            selector: string;
        } | {
            /** @constant */
            type: "hover";
            selector: string;
        } | {
            /** @constant */
            type: "fill";
            selector: string;
            value: string;
        } | {
            /** @constant */
            type: "select";
            selector: string;
            value: string;
        } | {
            /** @constant */
            type: "press";
            selector: string;
            value: string;
        } | {
            /** @constant */
            type: "check";
            selector: string;
            checked: boolean;
        } | {
            /** @constant */
            type: "scroll";
            x: number;
            y: number;
        } | {
            /** @constant */
            type: "resize";
            width: number;
            height: number;
        } | {
            /** @constant */
            type: "inspect";
            selector: string;
        } | {
            /** @constant */
            type: "wait";
            milliseconds?: number;
            selector?: string;
        } | {
            /** @constant */
            type: "reload";
        } | {
            /** @constant */
            type: "evaluate";
            /** @description JavaScript expression executed only inside the isolated browser app frame; no Node.js or server shell access. */
            expression: string;
        } | {
            /** @constant */
            type: "key_down";
            key: string;
        } | {
            /** @constant */
            type: "key_up";
            key: string;
        } | {
            /** @constant */
            type: "mouse";
            /** @enum {unknown} */
            event: "move" | "click" | "down" | "up";
            x: number;
            y: number;
        };
        StudioDebugEvent: {
            sequence: number;
            /** Format: date-time */
            timestamp: string;
            /** @enum {unknown} */
            type: "console" | "pageerror" | "requestfailed" | "query" | "action" | "lifecycle";
            level: string;
            message: string;
            stack?: string;
            location?: {
                url: string;
                line: number;
                column: number;
            };
        };
        StudioDebugSession: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            appId: string;
            /** Format: uuid */
            versionId: string;
            /** Format: uuid */
            buildId: string;
            /** @constant */
            environment: "test";
            /** @enum {unknown} */
            status: "starting" | "ready" | "failed" | "closed";
            /** Format: date-time */
            createdAt: string;
            viewport: {
                width: number;
                height: number;
            };
            events: components["schemas"]["StudioDebugEvent"][];
            pendingQueries: number;
            pendingActions: number;
            observation?: {
                [key: string]: unknown;
            };
            failureCode?: string;
        };
        StudioDebugScreenshot: {
            /** Format: uuid */
            sessionId: string;
            /** Format: uuid */
            appId: string;
            /** Format: uuid */
            versionId: string;
            /** Format: date-time */
            capturedAt: string;
            /** @constant */
            mediaType: "image/png";
            width: number;
            height: number;
            base64: string;
            pendingQueries: number;
        };
        RegistrationOrganization: {
            /** Format: uuid */
            id: string;
            name: string;
        };
        RegistrationSettings: {
            /** Format: uuid */
            organizationId: string;
            invitationRequired: boolean;
            revision: number;
            /** Format: date-time */
            updatedAt: string | null;
        };
        UpdateRegistrationSettings: {
            invitationRequired: boolean;
            expectedRevision: number;
        };
        StudentProfile: {
            /** @description 学号 */
            studentNumber: string;
            /** @description 姓名 */
            name: string;
            /** @description 性别 */
            gender?: string;
            /** @description 出生日期 */
            birthDate?: string;
            /** @description 证件号码 */
            idNumber?: string;
            /** @description 班级 */
            className?: string;
            /** @description 入学时间 */
            admissionDate?: string;
            /** @description 毕业时间 */
            graduationDate?: string;
            /** @description 肄业时间 */
            withdrawalDate?: string;
            /** @description 预计毕业时间 */
            expectedGraduationDate?: string;
            /** @description 就读年级 */
            grade?: string;
            /** @description 目前就读学年 */
            academicYear?: string;
            /** @description 放假开始时间 */
            holidayStart?: string;
            /** @description 放假结束时间 */
            holidayEnd?: string;
            /** @description 学校名称 */
            schoolName?: string;
            /** @description 民族 */
            ethnicity?: string;
            /** @description 院系 */
            department?: string;
            /** @description 专业 */
            major?: string;
            /** @description 学籍状态 */
            status?: string;
        };
        StudentRecord: {
            /** Format: uuid */
            id: string;
            revision: number;
            profile: components["schemas"]["StudentProfile"];
            createdAt: string;
            updatedAt: string;
        };
        StudentTemplateKind: string;
        StudentTemplate: {
            /** Format: uuid */
            id: string;
            kind: components["schemas"]["StudentTemplateKind"];
            name: string;
            /** @enum {string} */
            format: "text" | "docx";
            body: string;
            requiredFields: string[];
            version: number;
            originalFileName: string;
            createdAt: string;
            document?: components["schemas"]["StudentRichDocument"] | null;
        };
        StudentCertificateSummary: {
            /** Format: uuid */
            id: string;
            number: string;
            /** Format: uuid */
            studentId: string;
            studentNumber: string;
            studentName: string;
            templateName: string;
            issueDate: string;
            createdAt: string;
            createdBy: string;
        };
        StudentCertificate: {
            summary: components["schemas"]["StudentCertificateSummary"];
            template: components["schemas"]["StudentTemplate"];
            fields: {
                [key: string]: string;
            };
            contentBase64: string | null;
            fileName: string;
        };
        StudentCenterSettings: {
            schoolName: string;
            departmentName: string;
            signature: string;
            academicYear: string;
            holidayStart: string;
            holidayEnd: string;
            revision: number;
        };
        StudentCenterMember: {
            /** Format: uuid */
            userId: string;
            name: string;
            username: string;
            /** @enum {string} */
            role: "administrator" | "staff";
        };
        StudentCenterBootstrap: {
            settings: components["schemas"]["StudentCenterSettings"];
            currentUser: components["schemas"]["StudentCenterMember"];
            counts: {
                students: number;
                certificates: number;
                todayCertificates: number;
            };
            templates: components["schemas"]["StudentTemplate"][];
            recent: components["schemas"]["StudentCertificateSummary"][];
        };
        StudentSearch: {
            keyword?: string;
            studentNumber?: string;
            name?: string;
            className?: string;
            status?: string;
            page?: number;
            pageSize?: number;
        };
        StudentSearchResult: {
            items: components["schemas"]["StudentRecord"][];
            total: number;
            page: number;
            pageSize: number;
            classes: string[];
        };
        StudentSave: {
            /** Format: uuid */
            id?: string;
            revision?: number;
            profile: components["schemas"]["StudentProfile"];
        };
        StudentArchive: {
            /** Format: uuid */
            id: string;
            revision: number;
        };
        StudentImport: {
            fileName: string;
            contentBase64: string;
            /** @enum {string} */
            mode: "preview" | "commit";
            updateExisting?: boolean;
        };
        StudentImportResult: {
            total: number;
            valid: number;
            created: number;
            updated: number;
            skipped: number;
            columns: string[];
            sample: components["schemas"]["StudentProfile"][];
            issues: {
                row: number;
                message: string;
            }[];
            committed: boolean;
        };
        StudentTemplateSave: {
            kind: components["schemas"]["StudentTemplateKind"];
            name: string;
            body: string;
            /** Format: uuid */
            expectedId?: string;
            document?: components["schemas"]["StudentRichDocument"];
        };
        StudentTemplateUpload: {
            kind: components["schemas"]["StudentTemplateKind"];
            name: string;
            fileName: string;
            contentBase64: string;
            /** Format: uuid */
            expectedId?: string;
        };
        StudentCertificateCreate: {
            /** Format: uuid */
            studentId: string;
            /** Format: uuid */
            templateId: string;
            issueDate: string;
            fields: {
                [key: string]: string;
            };
        };
        StudentCertificateSearch: {
            keyword?: string;
            page?: number;
            pageSize?: number;
        };
        StudentCertificateSearchResult: {
            items: components["schemas"]["StudentCertificateSummary"][];
            total: number;
            page: number;
            pageSize: number;
        };
        StudentCenterSettingsSave: {
            schoolName: string;
            departmentName: string;
            signature: string;
            academicYear: string;
            holidayStart: string;
            holidayEnd: string;
            revision: number;
        };
        StudentCenterMemberSave: {
            /** Format: uuid */
            userId?: string;
            username?: string;
            name?: string;
            password?: string;
            /** @enum {string} */
            role: "administrator" | "staff" | "remove";
        };
        StudentCenterMembers: {
            items: components["schemas"]["StudentCenterMember"][];
        };
        StudentCenterRequest: {
            /** @constant */
            action: "templates.delete";
            payload: components["schemas"]["StudentTemplateDelete"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "bootstrap";
            payload: Record<string, never>;
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "students.search";
            payload: components["schemas"]["StudentSearch"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "students.save";
            payload: components["schemas"]["StudentSave"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "students.archive";
            payload: components["schemas"]["StudentArchive"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "students.import";
            payload: components["schemas"]["StudentImport"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "templates.save";
            payload: components["schemas"]["StudentTemplateSave"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "templates.upload";
            payload: components["schemas"]["StudentTemplateUpload"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "templates.file";
            payload: {
                /** Format: uuid */
                id: string;
            };
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "certificates.create";
            payload: components["schemas"]["StudentCertificateCreate"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "certificates.search";
            payload: components["schemas"]["StudentCertificateSearch"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "certificates.get";
            payload: {
                /** Format: uuid */
                id: string;
            };
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "settings.save";
            payload: components["schemas"]["StudentCenterSettingsSave"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "members.list";
            payload: Record<string, never>;
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "members.save";
            payload: components["schemas"]["StudentCenterMemberSave"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "auth.session";
            payload: Record<string, never>;
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "auth.login";
            payload: components["schemas"]["StudentCenterLogin"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "auth.logout";
            payload: Record<string, never>;
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "auth.password";
            payload: components["schemas"]["StudentCenterPassword"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "certificates.preview";
            payload: components["schemas"]["StudentCertificateCreate"];
            /** Format: uuid */
            versionId: string;
        } | {
            /** @constant */
            action: "templates.import";
            /** Format: uuid */
            versionId: string;
            payload: components["schemas"]["StudentTemplateImport"];
        } | {
            /** @constant */
            action: "templates.export";
            /** Format: uuid */
            versionId: string;
            payload: components["schemas"]["StudentTemplateExport"];
        };
        StudentCenterResponse: {
            /** @constant */
            action: "templates.delete";
            result: components["schemas"]["StudentTemplateDeleteResult"];
        } | {
            /** @constant */
            action: "bootstrap";
            result: components["schemas"]["StudentCenterBootstrap"];
        } | {
            /** @constant */
            action: "students.search";
            result: components["schemas"]["StudentSearchResult"];
        } | {
            /** @constant */
            action: "students.save";
            result: components["schemas"]["StudentRecord"];
        } | {
            /** @constant */
            action: "students.archive";
            result: {
                archived: boolean;
            };
        } | {
            /** @constant */
            action: "students.import";
            result: components["schemas"]["StudentImportResult"];
        } | {
            /** @constant */
            action: "templates.save";
            result: components["schemas"]["StudentTemplate"];
        } | {
            /** @constant */
            action: "templates.upload";
            result: components["schemas"]["StudentTemplate"];
        } | {
            /** @constant */
            action: "templates.file";
            result: {
                contentBase64: string;
                fileName: string;
            };
        } | {
            /** @constant */
            action: "certificates.create";
            result: components["schemas"]["StudentCertificate"];
        } | {
            /** @constant */
            action: "certificates.search";
            result: components["schemas"]["StudentCertificateSearchResult"];
        } | {
            /** @constant */
            action: "certificates.get";
            result: components["schemas"]["StudentCertificate"];
        } | {
            /** @constant */
            action: "settings.save";
            result: components["schemas"]["StudentCenterSettings"];
        } | {
            /** @constant */
            action: "members.list";
            result: components["schemas"]["StudentCenterMembers"];
        } | {
            /** @constant */
            action: "members.save";
            result: components["schemas"]["StudentCenterMembers"];
        } | {
            /** @constant */
            action: "auth.session";
            result: components["schemas"]["StudentCenterSession"];
        } | {
            /** @constant */
            action: "auth.login";
            result: components["schemas"]["StudentCenterSession"];
        } | {
            /** @constant */
            action: "auth.logout";
            result: components["schemas"]["StudentCenterSession"];
        } | {
            /** @constant */
            action: "auth.password";
            result: {
                changed: boolean;
            };
        } | {
            /** @constant */
            action: "certificates.preview";
            result: components["schemas"]["StudentCertificatePreview"];
        } | {
            /** @constant */
            action: "templates.import";
            result: components["schemas"]["StudentTemplateImportResult"];
        } | {
            /** @constant */
            action: "templates.export";
            result: {
                fileName: string;
                contentBase64: string;
            };
        };
        StudentCenterEnable: {
            schoolName?: string;
            departmentName: string;
            adminUsername: string;
            adminPassword: string;
        };
        StudentCenterSession: {
            user: components["schemas"]["StudentCenterMember"] | null;
            departmentName: string;
        };
        StudentCenterLogin: {
            username: string;
            password: string;
        };
        StudentCenterPassword: {
            currentPassword: string;
            password: string;
        };
        StudentCertificatePreview: {
            template: components["schemas"]["StudentTemplate"];
            fields: {
                [key: string]: string;
            };
            contentBase64: string | null;
            fileName: string;
        };
        StudentRichMark: {
            /** @enum {string} */
            type: "bold" | "italic" | "underline" | "strike" | "textStyle";
            attrs?: {
                /** @enum {string} */
                fontFamily?: "SimSun" | "SimHei" | "Microsoft YaHei" | "FangSong" | "KaiTi" | "Arial";
                fontSize?: string;
                color?: string;
            };
        };
        StudentRichNode: {
            /** @enum {string} */
            type: "paragraph" | "heading" | "text" | "hardBreak" | "horizontalRule" | "bulletList" | "orderedList" | "listItem" | "templateField" | "table" | "tableRow" | "tableCell" | "tableHeader" | "image";
            text?: string;
            attrs?: {
                /** @enum {string} */
                textAlign?: "left" | "center" | "right" | "justify";
                lineHeight?: string;
                firstLineIndent?: number;
                spaceBefore?: number;
                spaceAfter?: number;
                /** @enum {integer} */
                level?: 1 | 2 | 3;
                start?: number;
                fieldKey?: string;
                src?: string;
                width?: number;
                height?: number;
                alt?: string;
                title?: string;
                colspan?: number;
                rowspan?: number;
                colwidth?: number[];
            };
            marks?: components["schemas"]["StudentRichMark"][];
            content?: components["schemas"]["StudentRichNode"][];
        };
        StudentRichDocument: {
            /** @constant */
            schemaVersion: "1.0";
            /** @constant */
            type: "doc";
            content: components["schemas"]["StudentRichNode"][];
        };
        StudentTemplateImport: {
            fileName: string;
            contentBase64: string;
        };
        StudentTemplateImportResult: {
            document: components["schemas"]["StudentRichDocument"];
            body: string;
            suggestedName: string;
            notes: string[];
        };
        StudentTemplateExport: {
            name: string;
            document: components["schemas"]["StudentRichDocument"];
        };
        StudentTemplateDelete: {
            /** Format: uuid */
            id: string;
        };
        StudentTemplateDeleteResult: {
            /** @constant */
            deleted: true;
        };
        SiteDataSource: {
            key: string;
            name: string;
            /** @enum {string} */
            mode: "managed" | "external";
            /** @constant */
            engine: "postgresql";
            /** @constant */
            environment: "test";
            host: string;
            port: number;
            database: string;
            username: string;
            secretConfigured: boolean;
            revision: number;
            tls: boolean;
        };
        SiteDataSourceInput: {
            key: string;
            name: string;
            /** @enum {string} */
            mode: "managed" | "external";
            revision: number;
            host?: string;
            port?: number;
            database?: string;
            username?: string;
            password?: string;
            tls?: boolean;
        };
        SiteDataSources: {
            items: components["schemas"]["SiteDataSource"][];
        };
        SiteSchemaInspection: {
            source: components["schemas"]["SiteDataSource"];
            tables: {
                table: string;
                column: string;
                type: string;
                nullable: boolean;
            }[];
        };
        SiteRuntimeStatus: {
            /** Format: uuid */
            versionId: string;
            /** Format: uuid */
            buildId: string;
            backendDigest: string;
            /** @enum {string} */
            status: "ready" | "stopped" | "failed";
            logs: string[];
            updatedAt: string;
        };
        SiteRuntimeOverview: {
            items: components["schemas"]["SiteRuntimeStatus"][];
            enabled: boolean;
        };
        SiteRuntimeDeploy: {
            /** Format: uuid */
            versionId: string;
        };
        SiteRuntimeActivate: {
            /** Format: uuid */
            versionId: string;
            expectedRevision: number;
        };
        SiteProxyRequest: {
            /** Format: uuid */
            versionId: string;
            /** @enum {string} */
            method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
            path: string;
            body?: unknown;
            headers?: {
                [key: string]: string;
            };
        };
        SiteProxyResponse: {
            status: number;
            headers: {
                [key: string]: string | string[];
            };
            body: unknown;
        };
        SiteDataSourceInspect: {
            key: string;
        };
    };
    responses: never;
    parameters: {
        /** @description Must match active server-validated membership; never trusted as authority. */
        Organization: string;
        /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
        Idempotency: string;
        /** @description Strong ETag of current resource revision; stale -> 412. */
        IfMatch: string;
        /** @description Opaque signed cursor bound to caller, org, filters and sort. */
        Cursor: string;
        PageSize: number;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    readiness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getMe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CurrentUser"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listOrganizations: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationPage"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createOrganization: {
        parameters: {
            query?: never;
            header: {
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateOrganization"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    /** @description Quoted resource revision, e.g. "1" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Organization"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listOrganizationMembers: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                orgId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationMemberPage"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    upsertOrganizationMember: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                orgId: string;
                userId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpsertOrganizationMember"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationMember"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listRoles: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RolePage"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createRole: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRole"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Role"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listResourceGrants: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResourceGrantPage"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createResourceGrant: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateResourceGrant"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResourceGrant"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listApps: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioAppPage"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createApp: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StudioAppCreate"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioApp"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listLogicalDataSources: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LogicalDataSourcePage"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createLogicalDataSource: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateLogicalDataSource"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    "X-Request-Id"?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LogicalDataSource"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listPhysicalConnections: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PhysicalConnectionPage"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createPhysicalConnection: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreatePhysicalConnection"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    "X-Request-Id"?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PhysicalConnection"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listDatasets: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetPage"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createDataset: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDataset"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    "X-Request-Id"?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Dataset"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listReports: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioReportPage"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createReport: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StudioReportCreate"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioReport"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listReleaseRequests: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stage06ReleasePage"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createReleaseRequest: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Stage06CreateRelease"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stage06Release"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listPermissions: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PermissionPage"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    setRolePermissions: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                roleId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetRolePermissions"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Role"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createRoleBinding: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRoleBinding"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RoleBinding"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    deleteRoleBinding: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                roleBindingId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RoleBinding"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    deleteResourceGrant: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                resourceGrantId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetGrant"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getApp: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioApp"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    updateApp: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
                /** @description Strong ETag of current resource revision; stale -> 412. */
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateApp"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    /** @description Quoted resource revision, e.g. "1" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["App"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    setAppMember: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
                userId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetAppMember"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppMember"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createArtifactUpload: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ArtifactUpload"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UploadTicket"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    uploadArtifactContent: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                artifactId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/octet-stream": string;
            };
        };
        responses: {
            /** @description Artifact sealed */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UploadTicket"];
                };
            };
            /** @description Invalid archive */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unauthenticated */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Digest or replay conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Archive too large */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listAppVersions: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioVersionPage"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    uploadAppVersion: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SourceUpload"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioVersion"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getAppVersion: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appVersionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppVersion"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createBuild: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appVersionId: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["StudioBuildCommand"];
            };
        };
        responses: {
            /** @description Success */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioBuild"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getBuildJob: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                buildJobId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioBuild"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    rotateCredential: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                physicalConnectionId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RotateCredential"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PhysicalConnection"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createConnectionTest: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                physicalConnectionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            202: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogJob"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getConnectionTest: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                connectionTestId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogJob"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listSourceMappings: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                logicalDataSourceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceMappingPage"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    setSourceMapping: {
        parameters: {
            query: {
                environment: "test" | "production";
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
                /** @description Strong ETag of current resource revision; stale -> 412. */
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                logicalDataSourceId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetSourceMapping"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceMapping"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listDatasetVersions: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                datasetId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetVersionPage"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createDatasetVersion: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                datasetId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDatasetVersion"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetVersion"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getDatasetVersion: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                datasetVersionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetVersion"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getReport: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                reportId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioReport"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listReportVersions: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                reportId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioReportVersionPage"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    saveReportVersion: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                reportId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SaveReportVersion"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioReportVersion"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getReportVersion: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                reportVersionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportVersion"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createTestQuery: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTestQuery"];
            };
        };
        responses: {
            /** @description Success */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryJob"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getQueryJob: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                queryJobId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryJob"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    cancelQueryJob: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                queryJobId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryJob"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getReleaseRequest: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                releaseRequestId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stage06Release"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    submitReleaseRequest: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                releaseRequestId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stage06Release"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listApprovals: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                releaseRequestId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stage06Release"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createApproval: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                releaseRequestId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Stage06Approval"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stage06Release"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    cancelReleaseRequest: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                releaseRequestId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stage06Release"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createDeployment: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                releaseRequestId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stage06Deployment"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getDeployment: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                deploymentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stage06Deployment"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createRollbackRequest: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Stage06Rollback"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stage06Release"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listRuntimeGrants: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                deploymentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RuntimeGrantPage"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    revokeRuntimeGrant: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                runtimeGrantId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RevokeRuntimeGrant"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RuntimeGrant"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getRuntimeContext: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RuntimeContext"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createRuntimeQuery: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRuntimeQuery"];
            };
        };
        responses: {
            /** @description Success */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryJob"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createReportQuery: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                reportId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateReportQuery"];
            };
        };
        responses: {
            /** @description Success */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryJob"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listAuditLogs: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuditLogPage"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listRuntimeAppRecords: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
                collectionKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppRecordPage"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createRuntimeAppRecord: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
                collectionKey: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WriteAppRecord"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    /** @description Quoted resource revision, e.g. "1" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppRecord"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    deleteRuntimeAppRecord: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
                /** @description Strong ETag of current resource revision; stale -> 412. */
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                appId: string;
                collectionKey: string;
                recordId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    /** @description Quoted resource revision, e.g. "1" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppRecord"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    updateRuntimeAppRecord: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
                /** @description Strong ETag of current resource revision; stale -> 412. */
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                appId: string;
                collectionKey: string;
                recordId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WriteAppRecord"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    /** @description Quoted resource revision, e.g. "1" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppRecord"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listPreviewAppRecords: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
                appVersionId: string;
                collectionKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppRecordPage"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createPreviewAppRecord: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
                appVersionId: string;
                collectionKey: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WriteAppRecord"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    /** @description Quoted resource revision, e.g. "1" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppRecord"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    deletePreviewAppRecord: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
                /** @description Strong ETag of current resource revision; stale -> 412. */
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                appId: string;
                appVersionId: string;
                collectionKey: string;
                recordId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    /** @description Quoted resource revision, e.g. "1" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppRecord"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    updatePreviewAppRecord: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
                /** @description Strong ETag of current resource revision; stale -> 412. */
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                appId: string;
                appVersionId: string;
                collectionKey: string;
                recordId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WriteAppRecord"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    /** @description Quoted resource revision, e.g. "1" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppRecord"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getLogicalDataSource: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                logicalDataSourceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LogicalDataSource"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    updateLogicalDataSource: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
                /** @description Strong ETag of current resource revision; stale -> 412. */
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                logicalDataSourceId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateLogicalDataSource"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LogicalDataSource"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    updatePhysicalConnection: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
                /** @description Strong ETag of current resource revision; stale -> 412. */
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                physicalConnectionId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdatePhysicalConnection"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PhysicalConnection"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listNetworkEndpoints: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NetworkEndpointPage"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createNetworkEndpoint: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateNetworkEndpoint"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    "X-Request-Id"?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreatedNetworkEndpoint"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listCredentialProfiles: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CredentialProfilePage"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listDatabaseAdapters: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdapterStatusPage"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createMetadataSync: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                physicalConnectionId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateMetadataSync"];
            };
        };
        responses: {
            /** @description Success */
            202: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogJob"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listMetadataSnapshots: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                physicalConnectionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MetadataSnapshotPage"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getCatalogJob: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                catalogJobId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogJob"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    retryCatalogJob: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                catalogJobId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            202: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogJob"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getDataset: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                datasetId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Dataset"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    updateDataset: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
                /** @description Strong ETag of current resource revision; stale -> 412. */
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                datasetId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateDataset"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Dataset"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    previewDataset: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                datasetId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDatasetPreview"];
            };
        };
        responses: {
            /** @description Success */
            202: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogJob"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listDatasetGrants: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                datasetId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetGrantPage"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createDatasetGrant: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                datasetId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDatasetGrant"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetGrant"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listSourceGrants: {
        parameters: {
            query?: {
                /** @description Opaque signed cursor bound to caller, org, filters and sort. */
                cursor?: components["parameters"]["Cursor"];
                pageSize?: components["parameters"]["PageSize"];
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                logicalDataSourceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetGrantPage"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createSourceGrant: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                logicalDataSourceId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDatasetGrant"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetGrant"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    validateTestQuery: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTestQuery"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryValidation"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createTestExport: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTestQuery"];
            };
        };
        responses: {
            /** @description Success */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryJob"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    diagnoseQuery: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTestQuery"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryValidation"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    downloadQueryExport: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                queryJobId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Masked, bounded CSV; formula-safe cells. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/csv": string;
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    validateappsQuery: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRuntimeQuery"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryValidation"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    exportappsQuery: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRuntimeQuery"];
            };
        };
        responses: {
            /** @description Success */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryJob"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    validatereportsQuery: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                reportId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateReportQuery"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryValidation"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    exportreportsQuery: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                reportId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateReportQuery"];
            };
        };
        responses: {
            /** @description Success */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryJob"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listQueryPolicies: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                datasetId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: components["schemas"]["QueryPolicy"][];
                    };
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createQueryPolicy: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                datasetId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QueryPolicyInput"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryPolicy"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    setMemberDataScope: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                orgId: string;
                userId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MemberDataScope"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MemberDataScope"];
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listQueryAudits: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: components["schemas"]["QueryAudit"][];
                    };
                };
            };
            /** @description Invalid query */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    studioCapabilities: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioCapabilities"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getStudioAppVersion: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
                appVersionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioVersion"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    restoreAppVersion: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RestoreVersion"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioVersion"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getTestPreview: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
                appVersionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioPreview"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    queryTestApp: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
                appVersionId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StudioQuery"];
            };
        };
        responses: {
            /** @description Success */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryJob"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    restoreReportVersion: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                reportId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RestoreVersion"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioReportVersion"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    studioReleaseStatus: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioReleaseState"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getSiteSharing: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SiteSharing"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    updateSiteSharing: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateSiteSharing"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SiteSharing"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getSharedSite: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                shareId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SharedSite"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    querySharedSite: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                shareId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StudioQuery"];
            };
        };
        responses: {
            /** @description Success */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryJob"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listPersonalTokens: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PersonalTokenPage"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createPersonalToken: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreatePersonalToken"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreatedPersonalToken"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    revokePersonalToken: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                tokenId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PersonalToken"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getAuthOptions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthOptions"];
                };
            };
            /** @description Controlled authentication error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    passwordLogin: {
        parameters: {
            query?: never;
            header: {
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PasswordLogin"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BrowserSession"];
                };
            };
            /** @description Controlled authentication error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    passwordRegister: {
        parameters: {
            query?: never;
            header: {
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PasswordRegistration"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthMessage"];
                };
            };
            /** @description Controlled authentication error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getBrowserSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BrowserSession"];
                };
            };
            /** @description Controlled authentication error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    passwordLogout: {
        parameters: {
            query?: never;
            header: {
                /** @description Required for cookie authentication; bearer clients remain subject to human/permission gates. */
                "X-CSRF-Token"?: string;
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthMessage"];
                };
            };
            /** @description Controlled authentication error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    changePassword: {
        parameters: {
            query?: never;
            header: {
                /** @description Required for cookie authentication; bearer clients remain subject to human/permission gates. */
                "X-CSRF-Token"?: string;
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PasswordChange"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BrowserSession"];
                };
            };
            /** @description Controlled authentication error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listRegistrationInvitations: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegistrationInvitationPage"];
                };
            };
            /** @description Controlled authentication error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createRegistrationInvitation: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description Required for cookie authentication; bearer clients remain subject to human/permission gates. */
                "X-CSRF-Token"?: string;
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRegistrationInvitation"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreatedRegistrationInvitation"];
                };
            };
            /** @description Controlled authentication error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    revokeRegistrationInvitation: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description Required for cookie authentication; bearer clients remain subject to human/permission gates. */
                "X-CSRF-Token"?: string;
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                invitationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegistrationInvitation"];
                };
            };
            /** @description Controlled authentication error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getServerWorkspace: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServerWorkspace"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    readServerWorkspaceFile: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReadServerWorkspaceFile"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServerWorkspaceFile"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    writeServerWorkspace: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WriteServerWorkspace"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServerWorkspace"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    editServerWorkspace: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EditServerWorkspace"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServerWorkspace"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    removeServerWorkspaceFiles: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RemoveServerWorkspaceFiles"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServerWorkspace"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    moveServerWorkspaceFile: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MoveServerWorkspaceFile"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServerWorkspace"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    checkoutServerWorkspace: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CheckoutServerWorkspace"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServerWorkspace"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    commitServerWorkspace: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CommitServerWorkspace"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServerWorkspaceCommit"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    configurePhysicalConnection: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConfigurePhysicalConnection"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    "X-Request-Id"?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PhysicalConnection"];
                };
            };
            /** @description See documented error code */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description See documented error code */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    retryDeployment: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                deploymentId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stage06Deployment"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listDeployments: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stage06DeploymentPage"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getReleasePolicy: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReleasePolicy"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    setReleasePolicy: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetReleasePolicy"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReleasePolicy"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    productionSite: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioPreview"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    productionBoundQuery: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StudioQuery"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueryJob"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    releaseOptions: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReleaseOptions"];
                };
            };
            /** @description Structured failure */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Structured failure */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    openStudioDebugSession: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StudioDebugOpen"];
            };
        };
        responses: {
            /** @description Success */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioDebugSession"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getStudioDebugSession: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                debugSessionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioDebugSession"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    actStudioDebugSession: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                debugSessionId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StudioDebugAction"];
            };
        };
        responses: {
            /** @description Success */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioDebugSession"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    captureStudioDebugScreenshot: {
        parameters: {
            query?: {
                fullPage?: boolean;
                selector?: string;
            };
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                debugSessionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioDebugScreenshot"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    closeStudioDebugSession: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                debugSessionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioDebugSession"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getRegistrationSettings: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Current registration settings */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegistrationSettings"];
                };
            };
            /** @description Controlled authentication error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    updateRegistrationSettings: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description Required for cookie authentication; bearer clients remain subject to human/permission gates. */
                "X-CSRF-Token"?: string;
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateRegistrationSettings"];
            };
        };
        responses: {
            /** @description Current registration settings */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegistrationSettings"];
                };
            };
            /** @description Controlled authentication error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Controlled authentication error */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    enableStudentCenter: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StudentCenterEnable"];
            };
        };
        responses: {
            /** @description 成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudentCenterSettings"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getPublicSharedSite: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                shareId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SharedSite"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Validation error */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    studentCenterIndependentAction: {
        parameters: {
            query?: never;
            header: {
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StudentCenterRequest"];
            };
        };
        responses: {
            /** @description 成功 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudentCenterResponse"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description 字段说明、业务原因和请求追踪信息 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    listSiteDataSources: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SiteDataSources"];
                };
            };
        };
    };
    configureSiteDataSource: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SiteDataSourceInput"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SiteDataSource"];
                };
            };
        };
    };
    inspectSiteDataSource: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SiteDataSourceInspect"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SiteSchemaInspection"];
                };
            };
        };
    };
    getSiteRuntime: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SiteRuntimeOverview"];
                };
            };
        };
    };
    deployTestSiteRuntime: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SiteRuntimeDeploy"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SiteRuntimeStatus"];
                };
            };
        };
    };
    activateTestSiteVersion: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SiteRuntimeActivate"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SiteSharing"];
                };
            };
        };
    };
    requestSiteBackend: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
                /** @description 24h replay keyed by user, organization, operation and canonical body hash. */
                "Idempotency-Key": components["parameters"]["Idempotency"];
            };
            path: {
                appId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SiteProxyRequest"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SiteProxyResponse"];
                };
            };
        };
    };
    getStudioVersionSource: {
        parameters: {
            query?: never;
            header: {
                /** @description Must match active server-validated membership; never trusted as authority. */
                "X-Organization-Id": components["parameters"]["Organization"];
            };
            path: {
                appId: string;
                appVersionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    "Cache-Control"?: "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceUpload"];
                };
            };
            /** @description Validation error */
            400: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Invalid or missing access token */
            401: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Action forbidden */
            403: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Resource not visible */
            404: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description State or idempotency conflict */
            409: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Revision mismatch */
            412: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Request size limit exceeded */
            413: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Semantic policy violation */
            422: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Missing If-Match */
            428: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Internal error */
            500: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dependency unavailable or execution disabled */
            503: {
                headers: {
                    /** @description Trace identifier */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
}
