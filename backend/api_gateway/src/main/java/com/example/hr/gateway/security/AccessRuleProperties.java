package com.example.hr.gateway.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

/**
 * {@code app.access-rules} from the Config Server (config-repo/api-gateway.yml): who may call which path.
 * Re-bound by Spring Cloud on POST /api/admin/config/refresh; AccessRulesHolder checks and applies it.
 */
@ConfigurationProperties(prefix = "app")
public class AccessRuleProperties {

    private List<Rule> accessRules = new ArrayList<>();

    public List<Rule> getAccessRules() {
        return accessRules;
    }

    public void setAccessRules(List<Rule> accessRules) {
        this.accessRules = accessRules;
    }

    public static class Rule {
        /** Path patterns, e.g. /api/report/** (Spring PathPattern syntax). */
        private List<String> paths = new ArrayList<>();
        /** HTTP methods; empty = every method. */
        private List<String> methods = new ArrayList<>();
        /** Roles allowed (ADMIN, HR_MANAGER, HR_STAFF, EMPLOYEE). */
        private List<String> roles = new ArrayList<>();

        public List<String> getPaths() {
            return paths;
        }

        public void setPaths(List<String> paths) {
            this.paths = paths;
        }

        public List<String> getMethods() {
            return methods;
        }

        public void setMethods(List<String> methods) {
            this.methods = methods;
        }

        public List<String> getRoles() {
            return roles;
        }

        public void setRoles(List<String> roles) {
            this.roles = roles;
        }
    }
}
