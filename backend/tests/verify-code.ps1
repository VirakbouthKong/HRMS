# Focused regression checks only. No Docker, application servers, database or email access.
# Requires JDK 21+ (JAVA_HOME), Node, installed frontend dependencies and cached Maven dependencies.
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$oldMavenOpts = $env:MAVEN_OPTS
Push-Location $projectRoot
try {
    $env:MAVEN_OPTS = '-Xmx384m'
    $checks = @(
        @{Service='operation_service'; Tests='AttendanceTimeValidationTest,PayrollCalculationTest,LeaveSubmissionTest'},
        @{Service='auth_service'; Tests='ActionRepliesTest'},
        @{Service='api_gateway'; Tests='ActiveAccountFilterTest'}
    )
    foreach ($check in $checks) {
        Write-Host "Checking $($check.Service)..."
        & "backend/$($check.Service)/mvnw.cmd" -f "backend/$($check.Service)/pom.xml" -o -B "-Dtest=$($check.Tests)" '-DargLine=-Xmx384m' test
        if ($LASTEXITCODE -ne 0) { throw "$($check.Service) checks failed. No other checks were started." }
    }
    & node --max-old-space-size=384 backend/tests/frontend-store-contracts.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Frontend store checks failed.' }
    Write-Host 'All focused checks passed. Full application integration remains a separate check.'
} finally {
    $env:MAVEN_OPTS = $oldMavenOpts
    Pop-Location
}
