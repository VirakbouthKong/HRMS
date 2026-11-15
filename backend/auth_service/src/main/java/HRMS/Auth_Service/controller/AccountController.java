package HRMS.Auth_Service.controller;

import HRMS.Auth_Service.dto.request.CreateAccountRequest;
import HRMS.Auth_Service.dto.request.UpdateAccountRequest;
import HRMS.Auth_Service.dto.response.AccountResponse;
import HRMS.Auth_Service.dto.response.ApiResponse;
import HRMS.Auth_Service.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse> createAccount(@Valid @RequestBody CreateAccountRequest request) {
        return ActionReplies.from(accountService.createAccount(request));
    }

    @GetMapping
    public List<AccountResponse> getAllAccounts() {
        return accountService.getAllAccounts();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAccountById(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(accountService.getAccountById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse> updateAccount(@PathVariable Integer id,
                                     @Valid @RequestBody UpdateAccountRequest request) {

        return ActionReplies.from(accountService.updateAccount(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteAccount(@PathVariable Integer id) {
        return ActionReplies.from(accountService.deleteAccount(id));
    }

}