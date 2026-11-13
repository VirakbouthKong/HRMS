package HRMS.Auth_Service.service.impl;

import HRMS.Auth_Service.dto.response.PhotoResult;
import HRMS.Auth_Service.entity.Account;
import HRMS.Auth_Service.entity.AccountPhoto;
import HRMS.Auth_Service.exception.AuthException;
import HRMS.Auth_Service.repository.AccountPhotoRepository;
import HRMS.Auth_Service.repository.AccountRepository;
import HRMS.Auth_Service.service.PhotoService;
import HRMS.Auth_Service.util.DefaultAvatar;
import HRMS.Auth_Service.util.ImageType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class PhotoServiceImpl implements PhotoService {

    private final AccountRepository accountRepository;
    private final AccountPhotoRepository photoRepository;

    public PhotoServiceImpl(AccountRepository accountRepository, AccountPhotoRepository photoRepository) {
        this.accountRepository = accountRepository;
        this.photoRepository = photoRepository;
    }

    @Override
    @Transactional
    public void save(Integer accountId, byte[] data) {
        if (data == null || data.length == 0) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "Please choose an image file to upload.");
        }
        if (data.length > MAX_BYTES) {
            throw new AuthException(HttpStatus.PAYLOAD_TOO_LARGE, "The photo must be 3 MB or smaller.");
        }
        ImageType type = ImageType.detect(data)
                .orElseThrow(() -> new AuthException(HttpStatus.BAD_REQUEST,
                        "Only JPG, PNG or WebP images are allowed."));
        account(accountId);

        photoRepository.save(new AccountPhoto(accountId, type.contentType(), data, LocalDateTime.now()));
    }

    @Override
    @Transactional(readOnly = true)
    public PhotoResult forAccount(Integer accountId) {
        return photoOf(account(accountId));
    }

    @Override
    @Transactional(readOnly = true)
    public PhotoResult forEmployee(Integer employeeId) {
        return accountRepository.findByEmployeeId(employeeId)
                .map(this::photoOf)
                .orElseGet(() -> new PhotoResult(DefaultAvatar.silhouette(), DefaultAvatar.CONTENT_TYPE, true));
    }

    @Override
    @Transactional
    public void delete(Integer accountId) {
        if (photoRepository.existsById(accountId)) {
            photoRepository.deleteById(accountId);
        }
    }

    private Account account(Integer accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED,
                        "Account not found. Please log in again."));
    }

    private PhotoResult photoOf(Account account) {
        return photoRepository.findById(account.getAccountId())
                .map(p -> new PhotoResult(p.getData(), p.getContentType(), false))
                .orElseGet(() -> new PhotoResult(DefaultAvatar.forUser(account.getUserName()),
                        DefaultAvatar.CONTENT_TYPE, true));
    }
}
