package com.example.cron.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.YearMonth;
import java.util.Collections;

@Service
public class OperationsServiceClient {

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public OperationsServiceClient(
            @Value("${operation.service.base-url}") String baseUrl,
            @Value("${internal.api.key}") String internalApiKey) {
        
        this.baseUrl = baseUrl;
        this.restTemplate = new RestTemplate();
        
        // Add interceptor to inject the internal API key into every request
        ClientHttpRequestInterceptor interceptor = (request, body, execution) -> {
            request.getHeaders().add("X-Internal-Api-Key", internalApiKey);
            return execution.execute(request, body);
        };
        this.restTemplate.setInterceptors(Collections.singletonList(interceptor));
    }

    public void triggerPayrollGeneration(YearMonth period) {
        String url = baseUrl + "/api/internal/payroll/generate?period=" + period.toString();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<Void> request = new HttpEntity<>(headers);
        
        restTemplate.postForEntity(url, request, String.class);
    }

    public void triggerContractExpiryCheck(int daysAhead) {
        String url = baseUrl + "/api/internal/employees/check-contract-expiries?daysAhead=" + daysAhead;
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<Void> request = new HttpEntity<>(headers);
        
        restTemplate.postForEntity(url, request, String.class);
    }

    public void triggerMarkAbsences(java.time.LocalDate date) {
        String url = baseUrl + "/api/internal/attendance/mark-absences?date=" + date.toString();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<Void> request = new HttpEntity<>(headers);
        
        restTemplate.postForEntity(url, request, String.class);
    }
}
