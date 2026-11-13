package com.example.hr.gateway.security;

/** app.access-rules contains a mistake (unknown role, empty list, bad path or method). */
public class InvalidAccessRulesException extends RuntimeException {

    public InvalidAccessRulesException(String message) {
        super(message);
    }
}
