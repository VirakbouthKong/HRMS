package HRMS.Auth_Service.service;

import HRMS.Auth_Service.dto.request.CreateAccountRequest;
import HRMS.Auth_Service.dto.request.UpdateAccountRequest;
import HRMS.Auth_Service.dto.response.AccountResponse;
import HRMS.Auth_Service.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;

import java.util.List;

public interface AccountService {

    ApiResponse createAccount(CreateAccountRequest request);

    List<AccountResponse> getAllAccounts();

    AccountResponse getAccountById(Integer accountId);

    ApiResponse updateAccount(Integer accountId, UpdateAccountRequest request);

    ApiResponse deleteAccount(Integer accountId);

    ApiResponse resetPassword(Integer accountId);
}
