package com.example.cron.job;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.List;
import java.util.Map;

@Service
public class ReportDeliveryService {
    private final JdbcTemplate jdbc;
    private final JavaMailSender mail;
    private final String recipient;
    private final String sender;
    public ReportDeliveryService(JdbcTemplate jdbc,JavaMailSender mail,
            @Value("${app.reports.recipient:hr-reports@hrms.local}") String recipient,
            @Value("${app.reports.sender:no-reply@hrms.local}") String sender) {
        this.jdbc=jdbc;this.mail=mail;this.recipient=recipient;this.sender=sender;
    }
    public void weeklyReport() {
        LocalDate end=LocalDate.now(ZoneId.of("Asia/Phnom_Penh"));
        LocalDate start=end.minusDays(6);
        List<Map<String,Object>> attendance=jdbc.queryForList("select attendance_date, status, count(*) as employees from public.tbl_attendance where attendance_date between ? and ? group by attendance_date,status order by attendance_date,status",start,end);
        List<Map<String,Object>> workforce=jdbc.queryForList("select status,count(*) as employees from public.tbl_employee group by status order by status");
        String body="HRMS weekly report\nPeriod: "+start+" through "+end+"\n\nWorkforce\n"+rows(workforce)+"\nAttendance\n"+rows(attendance);
        send("HRMS weekly report: "+start+" to "+end,body);
    }
    public void contractReport(int daysAhead) {
        LocalDate target=LocalDate.now(ZoneId.of("Asia/Phnom_Penh")).plusDays(daysAhead);
        List<Map<String,Object>> contracts=jdbc.queryForList("select employee_code, first_name, last_name, contract_end_date from public.tbl_employee where status='ACTIVE' and contract_end_date=? order by employee_id",target);
        send("HRMS contract expiry alerts: "+target,"Contracts expiring in "+daysAhead+" days:\n"+rows(contracts));
    }
    private String rows(List<Map<String,Object>> rows) {
        if(rows.isEmpty())return "No matching records.\n";
        StringBuilder text=new StringBuilder();
        for(Map<String,Object> row:rows) text.append(row).append('\n');
        return text.toString();
    }
    private void send(String subject,String body) {
        SimpleMailMessage message=new SimpleMailMessage();message.setFrom(sender);message.setTo(recipient);message.setSubject(subject);message.setText(body);
        mail.send(message); // Delivery failure propagates: job must be marked FAILED, never falsely COMPLETED.
    }
}
