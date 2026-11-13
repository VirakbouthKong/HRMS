package HRMS.Auth_Service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * A user's profile photo. Kept in its own table so loading an account never loads image bytes.
 * Deleting the account deletes the photo (ON DELETE CASCADE in the migration).
 */
@Entity
@Table(name = "tbl_account_photo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountPhoto {

    @Id
    @Column(name = "account_id")
    private Integer accountId;

    /** image/jpeg, image/png or image/webp, detected from the file's first bytes. */
    @Column(name = "content_type", nullable = false, length = 20)
    private String contentType;

    @Column(name = "data", nullable = false)
    private byte[] data;

    @Column(name = "updated_date", nullable = false)
    private LocalDateTime updatedDate;
}
