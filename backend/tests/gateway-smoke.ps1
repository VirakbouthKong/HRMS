param([string]$BaseUrl = 'http://localhost:8080', [PSCredential]$Credential)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromSeconds(30)
$results = [System.Collections.Generic.List[object]]::new()
$coverage = [System.Collections.Generic.HashSet[string]]::new()
function Call-Api($method, $path, $body = $null, $token = $null) {
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($method), "$BaseUrl$path")
    if ($token) { $request.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $token) }
    if ($null -ne $body) { $request.Content = [System.Net.Http.StringContent]::new(($body | ConvertTo-Json -Depth 20 -Compress), [Text.Encoding]::UTF8, 'application/json') }
    try {
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        $json = $null
        try { $json = $text | ConvertFrom-Json } catch {}
        return @{ Status = [int]$response.StatusCode; Json = $json; Text = $text }
    } finally { $request.Dispose() }
}
function Check($name, $response, [int[]]$expected) {
    $passed = $response.Status -in $expected
    $message = $null
    if (!$passed) { $message = $response.Text.Substring(0, [Math]::Min(300, $response.Text.Length)) }
    $results.Add([pscustomobject]@{Test=$name;Status=$response.Status;Expected=($expected -join ',');Passed=$passed;Failure=$message})
    $results | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 (Join-Path $PSScriptRoot 'gateway-smoke-results.json')
    Write-Output (('{0} {1}: {2}' -f $(if($passed){'PASS'}else{'FAIL'}),$name,$response.Status))
}
function Resolve-Path($path) {
    $values = @{id='2147483647';employeeId='2147483647';departmentId='2147483647';jobId='2147483647';attendanceId='2147483647';leaveId='2147483647';jobName='SmokeTestNonexistentJob';period='2026-11-01';attendanceDate='2026-11-05';status='ACTIVE';leaveType='ANNUAL'}
    foreach($key in $values.Keys) { $path = $path.Replace("{$key}",$values[$key]) }
    return $path
}
$docsResponse = Call-Api GET '/docs/all/openapi.json'
Check 'Merged OpenAPI document' $docsResponse @(200)
$docs = $docsResponse.Json
if (!$docs.paths) { throw 'Merged API documentation is unavailable.' }
foreach($path in @('/actuator/health','/swagger-ui.html','/v3/api-docs','/docs/auth/v3/api-docs','/docs/report/v3/api-docs','/docs/operation/v3/api-docs','/docs/cron/v3/api-docs','/api/public/config','/.well-known/jwks.json')) {
    Check "Public GET $path" (Call-Api GET $path) @(200)
}
# Every documented protected operation must reject an unauthenticated caller.
foreach($property in $docs.paths.PSObject.Properties) {
    foreach($op in $property.Value.PSObject.Properties | Where-Object Name -in @('get','post','put','patch','delete')) {
        $method = $op.Name.ToUpper(); $path = $property.Name
        if($path -in @('/api/auth/login','/api/auth/verify-otp','/api/public/config','/.well-known/jwks.json')) { continue }
        Check "Unauthenticated $method $path" (Call-Api $method (Resolve-Path $path)) @(401,403)
        [void]$coverage.Add("$method $path")
    }
}
$settings = @{}
Get-Content (Join-Path $PSScriptRoot '../.env') | Where-Object {$_ -match '^BOOTSTRAP_ADMIN_(USERNAME|PASSWORD)='} | ForEach-Object {$pair=$_ -split '=',2; $settings[$pair[0]]=$pair[1]}
$loginBody = @{userName=$settings.BOOTSTRAP_ADMIN_USERNAME;password=$settings.BOOTSTRAP_ADMIN_PASSWORD}
if($Credential) { $loginBody = @{userName=$Credential.UserName;password=$Credential.GetNetworkCredential().Password} }
$login = Call-Api POST '/api/auth/login' $loginBody
Check 'Admin login with configured bootstrap credentials' $login @(200)
if($login.Status -ne 200) { throw 'Configured bootstrap password no longer matches the account. No password was reset.' }
[void]$coverage.Add('POST /api/auth/login')
$mail = Invoke-RestMethod 'http://localhost:8025/api/v1/messages'
$message = $mail.messages | Where-Object {$_.Subject -match 'HRMS login code: ([0-9]{6})'} | Sort-Object Created -Descending | Select-Object -First 1
if(!$message -or $message.Subject -notmatch '([0-9]{6})') { throw 'No OTP email found in Mailpit.' }
$otp = $Matches[1]
$verify = Call-Api POST '/api/auth/verify-otp' @{userName=$loginBody.userName;otpCode=$otp}
Check 'Admin OTP verification' $verify @(200)
$token = $verify.Json.token
if(!$token) { throw 'OTP verification did not return a token.' }
[void]$coverage.Add('POST /api/auth/verify-otp')
Check 'OTP cannot be reused' (Call-Api POST '/api/auth/verify-otp' @{userName=$loginBody.userName;otpCode=$otp}) @(401)
# Existing data is only read. Missing IDs exercise not-found handling safely.
foreach($property in $docs.paths.PSObject.Properties) {
    if(!$property.Value.get -or $property.Name -notlike '/api/*' -or $property.Name -eq '/api/public/config') { continue }
    $path = Resolve-Path $property.Name
    if($property.Name -like '*/range') { $path += '?startDate=2026-11-01&endDate=2026-11-30' }
    if($path -eq '/api/payroll') { $path += '?period=2026-11' }
    $expected = @(200)
    if($property.Name -match '\{' -or $property.Name -match '/me($|/)') { $expected = @(200,400,404) }
    Check "Authenticated GET $($property.Name)" (Call-Api GET $path $null $token) $expected
}
# Validation checks must not create or change existing records.
foreach($property in $docs.paths.PSObject.Properties) {
    foreach($op in $property.Value.PSObject.Properties | Where-Object Name -in @('post','put','patch','delete')) {
        $path = $property.Name; $method = $op.Name.ToUpper()
        if($path -in @('/api/auth/login','/api/auth/verify-otp','/api/auth/me/photo','/api/admin/config/refresh','/api/attendance/check-in','/api/attendance/check-out')) { continue }
        $body = @{}
        if($method -eq 'DELETE' -or $path -match '/(approve|reject|cancel)$|/trigger$') { $body = $null }
        Check "Validation/missing target $method $path" (Call-Api $method (Resolve-Path $path) $body $token) @(400,404,409,422)
    }
}
Check 'Internal API is blocked at gateway' (Call-Api GET '/api/internal/auth/accounts/1' $null $token) @(403)
# Create, update and delete only uniquely named temporary fixtures.
$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$deptId=$null; $jobId=$null; $roleId=$null
try {
    $dept = Call-Api POST '/api/departments' @{departmentName="Smoke-$suffix";description='Temporary endpoint test'} $token
    Check 'Create temporary department' $dept @(201)
    $deptId = $dept.Json.departmentId
    if($deptId) {
        Check 'Read temporary department' (Call-Api GET "/api/departments/$deptId" $null $token) @(200)
        Check 'Update temporary department' (Call-Api PATCH "/api/departments/$deptId" @{departmentName="Smoke-$suffix";description='Updated test'} $token) @(200)
        $job = Call-Api POST '/api/jobs' @{jobTitle="Smoke-$suffix";description='Temporary endpoint test';departmentId=$deptId} $token
        Check 'Create temporary job' $job @(201)
        $jobId=$job.Json.jobId
        if($jobId) {
            Check 'Read temporary job' (Call-Api GET "/api/jobs/$jobId" $null $token) @(200)
            Check 'Update temporary job' (Call-Api PATCH "/api/jobs/$jobId" @{jobTitle="Smoke-$suffix";description='Updated test';departmentId=$deptId} $token) @(200)
        }
    }
    $roleName="SMOKE_$suffix"
    Check 'Create temporary role' (Call-Api POST '/api/roles' @{roleName=$roleName;description='Temporary endpoint test'} $token) @(200,201)
    $roles = Call-Api GET '/api/roles' $null $token
    $roleId=($roles.Json | Where-Object roleName -eq $roleName | Select-Object -First 1).roleId
    if($roleId) {
        Check 'Read temporary role' (Call-Api GET "/api/roles/$roleId" $null $token) @(200)
        Check 'Update temporary role' (Call-Api PUT "/api/roles/$roleId" @{roleName=$roleName;description='Updated test'} $token) @(200)
    }
} finally {
    if($roleId) { Check 'Delete temporary role' (Call-Api DELETE "/api/roles/$roleId" $null $token) @(200,204) }
    if($jobId) { Check 'Delete temporary job' (Call-Api DELETE "/api/jobs/$jobId" $null $token) @(200,204) }
    if($deptId) { Check 'Delete temporary department' (Call-Api DELETE "/api/departments/$deptId" $null $token) @(200,204) }
}
$report = Join-Path $PSScriptRoot 'gateway-smoke-results.json'
$results | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $report
Write-Output "RESULTS: $($results.Count) checks, $(@($results | Where-Object {!$_.Passed}).Count) failures; $($coverage.Count) operations exercised for access control/login."
Write-Output 'Scope: no valid payroll generation, real job triggering, attendance changes, account/password changes, or existing-photo modifications.'
$client.Dispose()
if(@($results | Where-Object {!$_.Passed}).Count) { exit 1 }
