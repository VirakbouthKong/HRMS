package HRMS.Auth_Service.service.impl;

import HRMS.Auth_Service.service.AccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import HRMS.Auth_Service.dto.request.CreateAccountRequest;
import HRMS.Auth_Service.dto.request.UpdateAccountRequest;
import HRMS.Auth_Service.dto.response.AccountResponse;
import HRMS.Auth_Service.dto.response.ApiResponse;
import HRMS.Auth_Service.entity.Account;
import HRMS.Auth_Service.entity.Role;
import HRMS.Auth_Service.mapper.AccountMapper;
import HRMS.Auth_Service.repository.AccountRepository;
import HRMS.Auth_Service.repository.RoleRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;

@Service
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final AccountMapper accountMapper;
    private final PasswordEncoder passwordEncoder;

    public AccountServiceImpl(AccountRepository accountRepository,
                              RoleRepository roleRepository,
                              AccountMapper accountMapper,
                              PasswordEncoder passwordEncoder) {

        this.accountRepository = accountRepository;
        this.roleRepository = roleRepository;
        this.accountMapper = accountMapper;
        this.passwordEncoder = passwordEncoder;
    }


    @Override
    public ApiResponse createAccount(CreateAccountRequest request) {

        if (accountRepository.existsByUserName(request.getUserName())) {
            return new ApiResponse(false, "Username already exists.");
        }

        if (accountRepository.existsByEmail(request.getEmail())) {
            return new ApiResponse(false, "Email already exists.");
        }

        Role role = roleRepository.findById(request.getRoleId())
                .orElse(null);

        if (role == null) {
            return new ApiResponse(false, "Role not found.");
        }

        Account account = accountMapper.toEntity(request);

        account.setUserPwd(passwordEncoder.encode(request.getUserPwd()));

        account.setRole(role);

        accountRepository.save(account);

        return new ApiResponse(true, "Dear HR : Account created successfully.");
    }

    @Override
    public List<AccountResponse> getAllAccounts() {
        List<Account> accounts = accountRepository.findAll();

        return accounts.stream()
                .map(accountMapper::toResponse)
                .toList();
    }

    @Override
    public AccountResponse getAccountById(Integer accountId) {

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found."));

        return accountMapper.toResponse(account);
    }

    @Override
    public ApiResponse updateAccount(Integer accountId,
                                     UpdateAccountRequest request) {

        Optional<Account> optionalAccount = accountRepository.findById(accountId);

        if (optionalAccount.isEmpty()) {
            return new ApiResponse(false, "Account not found.");
        }

        Account account = optionalAccount.get();

        // Check username duplicate
        Optional<Account> usernameAccount =
                accountRepository.findByUserName(request.getUserName());

        if (usernameAccount.isPresent()
                && !usernameAccount.get().getAccountId().equals(accountId)) {
            return new ApiResponse(false, "Username already exists.");
        }

        // Check email duplicate
        Optional<Account> emailAccount =
                accountRepository.findByEmail(request.getEmail());

        if (emailAccount.isPresent()
                && !emailAccount.get().getAccountId().equals(accountId)) {
            return new ApiResponse(false, "Email already exists.");
        }

        // Check role
        Optional<Role> role = roleRepository.findById(request.getRoleId());

        if (role.isEmpty()) {
            return new ApiResponse(false, "Role not found.");
        }

        // Update fields
        account.setUserName(request.getUserName());
        account.setEmail(request.getEmail());
        account.setStatus(request.getStatus());
        account.setRole(role.get());

        accountRepository.save(account);
        return new ApiResponse(true, "Account updated successfully.");
    }

    @Override
    public ApiResponse deleteAccount(Integer accountId) {

        Optional<Account> account = accountRepository.findById(accountId);

        if (account.isEmpty()) {
            return new ApiResponse(false, "Account not found.");
        }

        accountRepository.delete(account.get());

        return new ApiResponse(true, "Account deleted successfully.");
    }

    @Override
    public ApiResponse resetPassword(Integer accountId) {
        return null;
    }
}
