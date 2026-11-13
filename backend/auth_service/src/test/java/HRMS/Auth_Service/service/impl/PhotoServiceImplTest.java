package HRMS.Auth_Service.service.impl;

import HRMS.Auth_Service.dto.response.PhotoResult;
import HRMS.Auth_Service.entity.Account;
import HRMS.Auth_Service.entity.AccountPhoto;
import HRMS.Auth_Service.exception.AuthException;
import HRMS.Auth_Service.repository.AccountPhotoRepository;
import HRMS.Auth_Service.repository.AccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Repositories (the database) are mocked; type detection and default avatars are real. */
class PhotoServiceImplTest {

    private static final byte[] PNG_HEADER = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};

    private AccountRepository accounts;
    private AccountPhotoRepository photos;
    private PhotoServiceImpl service;

    @BeforeEach
    void setUp() {
        accounts = mock(AccountRepository.class);
        photos = mock(AccountPhotoRepository.class);
        service = new PhotoServiceImpl(accounts, photos);

        Account dara = Account.builder().accountId(12).userName("test_dara").employeeId(18).build();
        when(accounts.findById(12)).thenReturn(Optional.of(dara));
        when(accounts.findByEmployeeId(18)).thenReturn(Optional.of(dara));
        when(photos.findById(12)).thenReturn(Optional.empty());
    }

    private static byte[] png(int size) {
        byte[] b = new byte[size];
        System.arraycopy(PNG_HEADER, 0, b, 0, PNG_HEADER.length);
        return b;
    }

    // ---- save ----

    @Test
    void save_storesPngWithDetectedContentType() {
        byte[] image = png(100);

        service.save(12, image);

        ArgumentCaptor<AccountPhoto> saved = ArgumentCaptor.forClass(AccountPhoto.class);
        verify(photos).save(saved.capture());
        assertThat(saved.getValue().getAccountId()).isEqualTo(12);
        assertThat(saved.getValue().getContentType()).isEqualTo("image/png");
        assertThat(saved.getValue().getData()).isEqualTo(image);
        assertThat(saved.getValue().getUpdatedDate()).isNotNull();
    }

    @Test
    void save_acceptsExactly3MB() {
        service.save(12, png(3_145_728));

        verify(photos).save(any(AccountPhoto.class));
    }

    @Test
    void save_rejects3MBPlusOneWith413() {
        assertThatThrownBy(() -> service.save(12, png(3_145_729)))
                .isInstanceOfSatisfying(AuthException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE));
        verify(photos, never()).save(any());
    }

    @Test
    void save_emptyIs400() {
        assertThatThrownBy(() -> service.save(12, new byte[0]))
                .isInstanceOfSatisfying(AuthException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(photos, never()).save(any());
    }

    @Test
    void save_pdfIs400() {
        assertThatThrownBy(() -> service.save(12, "%PDF-1.7 not an image".getBytes(StandardCharsets.US_ASCII)))
                .isInstanceOfSatisfying(AuthException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(photos, never()).save(any());
    }

    @Test
    void save_unknownAccountIs401() {
        when(accounts.findById(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.save(99, png(100)))
                .isInstanceOfSatisfying(AuthException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
        verify(photos, never()).save(any());
    }

    // ---- view ----

    @Test
    void forAccount_returnsStoredPhoto() {
        byte[] image = png(50);
        when(photos.findById(12)).thenReturn(Optional.of(new AccountPhoto(12, "image/png", image, LocalDateTime.now())));

        PhotoResult result = service.forAccount(12);

        assertThat(result.isDefault()).isFalse();
        assertThat(result.contentType()).isEqualTo("image/png");
        assertThat(result.data()).isEqualTo(image);
    }

    @Test
    void forAccount_noPhotoReturnsInitials() {
        PhotoResult result = service.forAccount(12);

        assertThat(result.isDefault()).isTrue();
        assertThat(result.contentType()).isEqualTo("image/svg+xml");
        assertThat(new String(result.data(), StandardCharsets.UTF_8)).contains(">TD<");
    }

    @Test
    void forAccount_unknownAccountIs401() {
        when(accounts.findById(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.forAccount(99))
                .isInstanceOfSatisfying(AuthException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void employeePhoto_returnsLinkedAccountPhoto() {
        byte[] image = png(50);
        when(photos.findById(12)).thenReturn(Optional.of(new AccountPhoto(12, "image/png", image, LocalDateTime.now())));

        PhotoResult result = service.forEmployee(18);

        assertThat(result.isDefault()).isFalse();
        assertThat(result.data()).isEqualTo(image);
    }

    @Test
    void employeePhoto_accountWithoutPhotoIsInitials() {
        PhotoResult result = service.forEmployee(18);

        assertThat(result.isDefault()).isTrue();
        assertThat(new String(result.data(), StandardCharsets.UTF_8)).contains(">TD<");
    }

    @Test
    void employeePhoto_noAccountIsSilhouette() {
        when(accounts.findByEmployeeId(77)).thenReturn(Optional.empty());

        PhotoResult result = service.forEmployee(77);

        assertThat(result.isDefault()).isTrue();
        assertThat(result.contentType()).isEqualTo("image/svg+xml");
        String svg = new String(result.data(), StandardCharsets.UTF_8);
        assertThat(svg).startsWith("<svg").doesNotContain("<text");
    }

    // ---- delete ----

    @Test
    void delete_removesPhoto() {
        when(photos.existsById(12)).thenReturn(true);

        service.delete(12);

        verify(photos).deleteById(12);
    }

    @Test
    void delete_withoutPhotoDoesNothing() {
        when(photos.existsById(12)).thenReturn(false);

        service.delete(12);

        verify(photos, never()).deleteById(any());
    }
}
