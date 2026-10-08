package HRMS.Auth_Service.util;

import java.security.SecureRandom;

public class OTPGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generateOTP() {

        return String.valueOf(100000 + RANDOM.nextInt(900000));
    }

}
