package HRMS.Auth_Service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class OtpEmailService {

    private final JavaMailSender mailSender;
    private final String from;

    public OtpEmailService(JavaMailSender mailSender, @Value("${app.mail.from}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    /** Sends the login code. Throws a MailException if the SMTP server rejects or is unreachable. */
    public void sendLoginOtp(String to, String userName, String otpCode, int validMinutes) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("Your HRMS login code: " + otpCode);
        message.setText("""
                Hello %s,

                Your HRMS login code is: %s

                It expires in %d minutes and can be used only once.
                If you did not try to log in, please change your password and tell your administrator.

                HRMS
                """.formatted(userName, otpCode, validMinutes));
        mailSender.send(message);
    }
}
