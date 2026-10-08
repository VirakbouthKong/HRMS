@echo off
FOR /F "eol=# tokens=1,* delims==" %%A IN (.env) DO (
    SET "%%A=%%B"
)
.\mvnw.cmd spring-boot:run
pause
