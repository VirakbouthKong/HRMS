package com.example.hr.gateway.security;

import org.springframework.http.HttpMethod;
import org.springframework.http.server.PathContainer;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;
import org.springframework.web.util.pattern.PatternParseException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/** Checks app.access-rules and turns them into something fast to match against each request. */
public final class AccessRules {

    static final Set<String> KNOWN_ROLES = Set.of("ADMIN", "HR_MANAGER", "HR_STAFF", "EMPLOYEE");
    private static final Set<String> KNOWN_METHODS = Set.of("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS");

    private AccessRules() {
    }

    /** @throws InvalidAccessRulesException with a message naming the rule and the mistake */
    public static CompiledRules compile(List<AccessRuleProperties.Rule> rules) {
        List<CompiledRule> compiled = new ArrayList<>();
        int number = 0;
        for (AccessRuleProperties.Rule rule : rules == null ? List.<AccessRuleProperties.Rule>of() : rules) {
            number++;
            String where = "app.access-rules[" + (number - 1) + "]";
            if (rule.getPaths() == null || rule.getPaths().isEmpty()) {
                throw new InvalidAccessRulesException(where + ": paths must not be empty");
            }
            if (rule.getRoles() == null || rule.getRoles().isEmpty()) {
                throw new InvalidAccessRulesException(where + ": roles must not be empty");
            }
            List<PathPattern> patterns = new ArrayList<>();
            for (String path : rule.getPaths()) {
                if (path == null || !path.startsWith("/")) {
                    throw new InvalidAccessRulesException(where + ": path '" + path + "' must start with /");
                }
                try {
                    patterns.add(PathPatternParser.defaultInstance.parse(path));
                } catch (PatternParseException e) {
                    throw new InvalidAccessRulesException(where + ": invalid path pattern '" + path + "' (" + e.getMessage() + ")");
                }
            }
            Set<HttpMethod> methods = new LinkedHashSet<>();
            for (String method : rule.getMethods() == null ? List.<String>of() : rule.getMethods()) {
                String m = method == null ? "" : method.trim().toUpperCase();
                if (!KNOWN_METHODS.contains(m)) {
                    throw new InvalidAccessRulesException(where + ": unknown HTTP method '" + method + "'");
                }
                methods.add(HttpMethod.valueOf(m));
            }
            Set<String> roles = new LinkedHashSet<>();
            for (String role : rule.getRoles()) {
                String r = role == null ? "" : role.trim();
                if (!KNOWN_ROLES.contains(r)) {
                    throw new InvalidAccessRulesException(where + ": unknown role '" + role + "' (allowed: " + KNOWN_ROLES + ")");
                }
                roles.add(r);
            }
            compiled.add(new CompiledRule(List.copyOf(patterns), Set.copyOf(methods), Set.copyOf(roles)));
        }
        return new CompiledRules(List.copyOf(compiled));
    }

    record CompiledRule(List<PathPattern> patterns, Set<HttpMethod> methods, Set<String> roles) {
        boolean matches(HttpMethod method, PathContainer path) {
            return (methods.isEmpty() || methods.contains(method))
                    && patterns.stream().anyMatch(p -> p.matches(path));
        }
    }

    public record CompiledRules(List<CompiledRule> rules) {
        /** Roles allowed by the first matching rule; empty = no rule, any logged-in user. */
        public Optional<Set<String>> decide(HttpMethod method, String path) {
            PathContainer container = PathContainer.parsePath(path);
            return rules.stream().filter(r -> r.matches(method, container)).findFirst().map(CompiledRule::roles);
        }
    }
}
