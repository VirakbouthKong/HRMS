package HRMS.Auth_Service.service;

import HRMS.Auth_Service.dto.response.PhotoResult;

/** Profile photos, stored per account. Failures are AuthException with the HTTP status to return. */
public interface PhotoService {

    /** 3 MB. */
    int MAX_BYTES = 3 * 1024 * 1024;

    /** Upload or replace. 400 empty or not JPG/PNG/WebP, 413 over MAX_BYTES, 401 unknown account. */
    void save(Integer accountId, byte[] data);

    /** The account's photo, or an initials avatar. 401 unknown account. */
    PhotoResult forAccount(Integer accountId);

    /** Photo of the account linked to this employee; initials if no photo; silhouette if no account. */
    PhotoResult forEmployee(Integer employeeId);

    /** Back to the default avatar. Does nothing if there is no photo. */
    void delete(Integer accountId);
}
