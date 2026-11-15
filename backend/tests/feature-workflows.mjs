// Run only against the disposable hrms-qa stack. No production credentials are used.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const base = 'http://127.0.0.1:18080';
const mail = 'http://127.0.0.1:18025';
const results = [];
const suffix = Date.now();
// The server's "today" (attendance records use the Asia/Phnom_Penh date), as YYYY-MM-DD.
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date());
const initialPassword = 'Qa-Initial-2026!';
const newPassword = 'Qa-Changed-2026!';
const output = new URL('./feature-workflows-results.json', import.meta.url);
function check(name, passed, detail = '') {
  results.push({ name, passed: !!passed, detail });
  fs.writeFileSync(output, JSON.stringify(results, null, 2));
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`);
}
async function api(method, path, body, token, expected = [200], name = `${method} ${path}`) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  const passed = expected.includes(res.status);
  check(name, passed, `HTTP ${res.status}` + (!passed ? ' ' + text.slice(0, 250) : ''));
  return { status: res.status, data, headers: res.headers };
}
async function login(username, password, email, exercise = false) {
  const sent = await api('POST','/api/auth/login',{userName:username,password},undefined,[200],`${username}: password accepted`);
  if (sent.status !== 200) throw Error(`Login failed for ${username}`);
  if (exercise) {
    const cooldown=await api('POST','/api/auth/login',{userName:username,password},undefined,[200], 'OTP resend cooldown response');
    check('OTP resend cooldown enforced',cooldown.data.message?.includes('already sent'));
  }
  const inbox = await (await fetch(mail+'/api/v1/messages')).json();
  const message = inbox.messages.find(m => m.To.some(to => to.Address === email) && /\d{6}/.test(m.Subject));
  if (!message) throw Error('OTP not found for fixture');
  const otp = message.Subject.match(/\d{6}/)[0];
  if (exercise) await api('POST','/api/auth/verify-otp',{userName:username,otpCode:otp==='000000'?'000001':'000000'},undefined,[401], 'Incorrect OTP rejected');
  const verified=await api('POST','/api/auth/verify-otp',{userName:username,otpCode:otp},undefined,[200],`${username}: OTP login`);
  if (exercise) await api('POST','/api/auth/verify-otp',{userName:username,otpCode:otp},undefined,[401],'OTP cannot be reused');
  return verified.data.token;
}
const state = {};
async function group(name, fn) { try { await fn(); } catch(e) { check(name, false, e.message); } }
async function submitLeave(payload, name) {
  const response=await api('POST','/api/leaves',payload,state.EMPLOYEE.token,[201],name);
  if(response.data.leaveId)return response.data;
  throw Error('Leave submission failed; no database fixture fallback');
}
await group('Authentication and fixtures', async () => {
  await api('POST','/api/auth/login',{userName:'qa.admin',password:'Wrong-password'},undefined,[401],'Wrong password rejected');
  state.admin=await login('qa.admin','Qa-Only-2026!','qa.admin@hrms.local',true);
  await api('GET','/api/auth/me',undefined,state.admin);
  state.roles=(await api('GET','/api/roles',undefined,state.admin)).data;
  state.dept=(await api('POST','/api/departments',{departmentName:`QA-${suffix}`,description:'Disposable feature verification'},state.admin,[201],'Create department')).data;
  state.job=(await api('POST','/api/jobs',{jobTitle:`QA Engineer ${suffix}`,departmentId:state.dept.departmentId,description:'Fixture'},state.admin,[201],'Create job')).data;
  state.job2=(await api('POST','/api/jobs',{jobTitle:`QA Senior ${suffix}`,departmentId:state.dept.departmentId,description:'Fixture'},state.admin,[201],'Create second job')).data;
  for (const role of ['ADMIN','HR_MANAGER','HR_STAFF','EMPLOYEE']) {
    const username=`qa.${role.toLowerCase()}.${suffix}`,email=username+'@hrms.local';
    const request={firstName:'QA',lastName:role,dateOfBirth:'1995-06-15',email,contractEndDate:'2027-12-31',departmentId:state.dept.departmentId,jobId:state.job.jobId};
    let employee=(await api('POST','/api/employees',request,state.admin,[201],`Create ${role} employee`)).data;
    if (!employee.employeeId) throw Error('Employee creation failed; dependent tests cannot pass via database seeding');

    await api('POST','/api/accounts',{userName:username,userPwd:initialPassword,email,status:'ACTIVE',employeeId:employee.employeeId,roleId:state.roles.find(r=>r.roleName===role).roleId},state.admin,[200],`Create ${role} account`);
    let token=await login(username,initialPassword,email);
    await api('GET','/api/employees',undefined,token,[403],`${role}: first login restriction`);
    const changed=await api('PUT','/api/auth/change-password',{oldPassword:initialPassword,newPassword},token,[200],`${role}: initial password change`);
    token=changed.data.token;
    const accounts=(await api('GET','/api/accounts',undefined,state.admin)).data;
    state[role]={employee,request,username,email,token,account:accounts.find(a=>a.userName===username)};
  }
});
await group('Department and job workflow',async()=>{
  const d=state.dept.departmentId,j=state.job.jobId;
  await api('GET',`/api/departments/${d}`,undefined,state.admin);
  await api('PATCH',`/api/departments/${d}`,{departmentName:`QA Updated ${suffix}`,description:'Updated'},state.admin);
  await api('POST','/api/departments',{departmentName:`QA Updated ${suffix}`},state.admin,[409],'Duplicate department rejected');
  await api('DELETE',`/api/departments/${d}`,undefined,state.admin,[409],'Department with employees cannot be deleted');
  await api('GET',`/api/jobs?departmentId=${d}`,undefined,state.admin);
  await api('PATCH',`/api/jobs/${j}`,{departmentId:d,jobTitle:`QA Renamed ${suffix}`,description:'Updated'},state.admin);
  await api('POST','/api/jobs',{departmentId:d,jobTitle:`QA Renamed ${suffix}`},state.admin,[409],'Duplicate job rejected');
  await api('DELETE',`/api/jobs/${j}`,undefined,state.admin,[409],'In-use job cannot be deleted');
});
await group('Employee workflow',async()=>{
  const e=state.EMPLOYEE;
  await api('GET',`/api/employees/${e.employee.employeeId}`,undefined,state.admin);
  await api('PATCH',`/api/employees/${e.employee.employeeId}`,{...e.request,jobId:state.job2.jobId,jobChangeRemark:'QA promotion'},state.admin);
  const history=await api('GET',`/api/employees/${e.employee.employeeId}/job-history`,undefined,state.admin);
  check('Job change records history',Array.isArray(history.data)&&history.data.length===2);
  await api('GET','/api/employees/me',undefined,e.token);
  await api('GET','/api/employees/me/job-history',undefined,e.token);
  await api('PATCH',`/api/employees/${e.employee.employeeId}/status`,{status:'INACTIVE'},state.admin);
  const inactive=await api('GET',`/api/employees/${e.employee.employeeId}`,undefined,state.admin);
  check('Employee status persists',inactive.data.status==='INACTIVE');
  await api('PATCH',`/api/employees/${e.employee.employeeId}/status`,{status:'ACTIVE'},state.admin);
});
await group('Role permissions',async()=>{
  for (const role of ['ADMIN','HR_MANAGER','HR_STAFF','EMPLOYEE']) {
    const t=state[role].token;
    for (const [path,allowed] of [['/api/accounts',['ADMIN']],['/api/roles',['ADMIN']],['/api/employees',['ADMIN','HR_MANAGER','HR_STAFF']],['/api/attendance',['ADMIN','HR_MANAGER','HR_STAFF']],['/api/leaves',['ADMIN','HR_MANAGER','HR_STAFF']],['/api/payroll?period=2026-11',['ADMIN','HR_MANAGER']],['/api/report/dashboard',['ADMIN','HR_MANAGER','HR_STAFF']],['/api/v1/jobs/history',['ADMIN','HR_MANAGER']]]) {
      await api('GET',path,undefined,t,allowed.includes(role)?[200]:[403],`${role} access ${path}`);
    }
    await api('GET','/api/internal/auth/accounts/1',undefined,t,[403],`${role}: internal APIs blocked`);
  }
});
await group('Attendance workflow',async()=>{
  const e=state.EMPLOYEE,m=state.HR_MANAGER;
  const attendance=(await api('POST','/api/attendance/check-in',{},e.token,[201,200],'Employee check-in')).data;
  state.attendance=attendance;
  await api('POST','/api/attendance/check-in',{},e.token,[409],'Duplicate check-in rejected');
  await api('GET','/api/attendance/me',undefined,e.token);
  await api('POST','/api/attendance/check-out',{},e.token,[200],'Employee check-out');
  await api('POST','/api/attendance/check-out',{},e.token,[400,409],'Duplicate check-out rejected');
  // Corrections go through attendance requests: the employee asks, HR approves.
  const payload={attendanceId:attendance.attendanceId,checkIn:today+'T08:00:00',checkOut:today+'T12:00:00',reason:'QA attendance correction'};
  await api('POST','/api/attendance-requests',{...payload,checkOut:today+'T07:00:00'},e.token,[400],'Checkout before check-in rejected');
  const submitted=await api('POST','/api/attendance-requests',payload,e.token,[201],'Employee requests correction');
  await api('POST','/api/attendance-requests',payload,e.token,[409],'Second pending request rejected');
  await api('PATCH',`/api/attendance-requests/${submitted.data.correctionId}`,{status:'APPROVED'},e.token,[403],'Employee cannot approve own correction');
  await api('PATCH',`/api/attendance-requests/${submitted.data.correctionId}`,{status:'APPROVED'},m.token,[200],'Manager approves correction');
  const corrected=await api('GET',`/api/attendance/${attendance.attendanceId}`,undefined,m.token);
  check('Attendance correction persisted',corrected.data.checkIn===payload.checkIn&&['PRESENT','LATE'].includes(corrected.data.status));
});
await group('Leave workflow',async()=>{
  const e=state.EMPLOYEE,m=state.HR_MANAGER;
  await api('POST','/api/leaves',{leaveType:'ANNUAL',startDate:'2026-11-20',endDate:'2026-11-19'},e.token,[400],'Reversed leave dates rejected');
  const approved=await submitLeave({leaveType:'ANNUAL',startDate:'2026-11-16',endDate:'2026-11-16',reason:'QA annual paid leave'},'Submit annual leave');
  state.leave=approved;
  await api('PATCH',`/api/leaves/${approved.leaveId}/approve`,undefined,e.token,[403],'Employee cannot approve leave');
  const approval=await api('PATCH',`/api/leaves/${approved.leaveId}/approve`,undefined,m.token,[200],'Manager approves leave');
  check('Leave approval persisted',approval.data.status==='APPROVED');
  await api('PATCH',`/api/leaves/${approved.leaveId}/approve`,undefined,m.token,[400,409],'Already approved leave cannot be approved twice');
  const rejected=await submitLeave({leaveType:'UNPAID',startDate:'2026-11-17',endDate:'2026-11-17',reason:'QA reject'},'Submit leave for rejection');
  await api('PATCH',`/api/leaves/${rejected.leaveId}/reject`,undefined,m.token,[200],'Manager rejects leave');
  const cancelled=await submitLeave({leaveType:'UNPAID',startDate:'2026-11-18',endDate:'2026-11-18',reason:'QA cancel'},'Submit leave for cancellation');
  await api('PATCH',`/api/leaves/${cancelled.leaveId}/cancel`,undefined,e.token,[200],'Employee cancels own leave');
  await api('GET','/api/leaves/me',undefined,e.token);
});
await group('Payroll workflow',async()=>{
  const e=state.EMPLOYEE,m=state.HR_MANAGER;
  await api('POST',`/api/payroll/profiles/${e.employee.employeeId}`,{baseSalary:-1,dailyRate:50,latePenaltyPerMinute:1},m.token,[400],'Negative salary rejected');
  await api('POST',`/api/payroll/profiles/${e.employee.employeeId}`,{baseSalary:1500,dailyRate:50,latePenaltyPerMinute:1},m.token,[200,201],'Set salary profile');
  await api('GET',`/api/payroll/profiles/${e.employee.employeeId}`,undefined,m.token);
  const generated=await api('POST','/api/payroll/generate',{period:'2026-11'},m.token,[200],'Generate November payroll');
  const record=Array.isArray(generated.data)?generated.data.find(p=>p.employeeId===e.employee.employeeId):null;
  state.payroll=record;
  check('Paid annual leave does not reduce salary',record?.unpaidLeaveDays===0&&record?.netSalary===1500,JSON.stringify(record?{unpaidLeaveDays:record.unpaidLeaveDays,netSalary:record.netSalary}:null));
  const mine=await api('GET','/api/payroll/me',undefined,e.token);
  check('Employee payroll limited to self',Array.isArray(mine.data)&&mine.data.every(p=>p.employeeId===e.employee.employeeId));
  await api('POST','/api/payroll/generate',{period:'2026-11'},m.token,[200],'Regenerate same payroll period');
  const second=await api('GET','/api/payroll?period=2026-11',undefined,m.token);
  check('No duplicate payroll for employee/period',Array.isArray(second.data)&&second.data.filter(p=>p.employeeId===e.employee.employeeId).length===1);
});
await group('Photo workflow',async()=>{
  const e=state.EMPLOYEE;
  const fallback=await api('GET','/api/auth/me/photo',undefined,e.token);
  check('Default avatar header',fallback.headers.get('x-default-avatar')==='true');
  const invalid=new FormData();invalid.append('file',new Blob(['not an image'],{type:'image/png'}),'fake.png');
  await api('PUT','/api/auth/me/photo',invalid,e.token,[400],'Invalid photo rejected');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  const form=new FormData();form.append('file',new Blob([png],{type:'image/png'}),'qa.png');
  await api('PUT','/api/auth/me/photo',form,e.token,[200],'Upload profile photo');
  const photo=await api('GET','/api/auth/me/photo',undefined,e.token);
  check('Uploaded image served as PNG',photo.headers.get('content-type')?.startsWith('image/png'));
  await api('GET',`/api/photos/employees/${e.employee.employeeId}`,undefined,state.admin);
  await api('DELETE','/api/auth/me/photo',undefined,e.token,[200],'Delete fixture photo');
  const removed=await api('GET','/api/auth/me/photo',undefined,e.token);
  check('Default avatar restored',removed.headers.get('x-default-avatar')==='true');
});
await group('Persisted correction requests',async()=>{
  const e=state.EMPLOYEE,m=state.HR_MANAGER;
  const path='/api/attendance-requests';
  const record=(await api('GET','/api/attendance/me',undefined,e.token)).data;
  const payload={attendanceId:record.attendanceId,checkIn:today+'T07:55:00',checkOut:today+'T12:00:00',reason:'Persisted correction request'};
  await api('POST',path,{...payload,checkOut:today+'T07:00:00'},e.token,[400],'Correction request rejects invalid time range');
  const submitted=await api('POST',path,payload,e.token,[201],'Employee submits persistent correction request');
  const id=submitted.data.correctionId;
  check('New correction is pending',submitted.data.status==='PENDING');
  await api('POST',path,payload,e.token,[409],'Duplicate pending correction rejected');
  const unchanged=await api('GET','/api/attendance/me',undefined,e.token);
  check('Request does not change attendance before approval',unchanged.data.checkIn===record.checkIn);
  const mine=await api('GET',path,undefined,e.token);
  check('Correction request reloads from server',mine.data.some(r=>r.correctionId===id&&r.status==='PENDING'));
  check('Employee sees only own requests',mine.data.every(r=>r.employeeId===e.employee.employeeId));
  await api('PATCH',path+'/'+id,{status:'APPROVED'},e.token,[403],'Employee cannot approve own request');
  await api('PATCH',path+'/'+id,{status:'APPROVED'},state.admin,[200],'Admin without employee link approves request');
  const saved=await api('GET','/api/attendance/me',undefined,e.token);
  check('Approved correction changes attendance',saved.data.checkIn===payload.checkIn);
  const reloaded=await api('GET',path,undefined,m.token);
  check('Approval and reviewer survive reload',reloaded.data.some(r=>r.correctionId===id&&r.status==='APPROVED'&&r.reviewedBy==='qa.admin'));
  await api('PATCH',path+'/'+id,{status:'REJECTED'},m.token,[409],'Reviewed request cannot be reviewed again');
  const rejected=await api('POST',path,{...payload,reason:'Request to reject'},e.token,[201]);
  await api('PATCH',path+'/'+rejected.data.correctionId,{status:'REJECTED'},m.token,[200],'Manager rejects request');
  const later=await api('GET',path,undefined,e.token);
  check('Rejection persists',later.data.some(r=>r.correctionId===rejected.data.correctionId&&r.status==='REJECTED'));
});
await group('Persistent payment and department conflicts',async()=>{
  const t=state.HR_MANAGER.token;
  const all=await api('GET','/api/payroll?period=2026-11',undefined,t);
  const record=all.data.find(p=>p.employeeId===state.EMPLOYEE.employee.employeeId);
  await api('PATCH',`/api/payroll/${record.payrollId}/paid`,undefined,state.EMPLOYEE.token,[403],'Employee cannot mark payroll paid');
  const paid=await api('PATCH',`/api/payroll/${record.payrollId}/paid`,undefined,t,[200],'Mark payroll paid');
  check('Paid status and date returned',paid.data.status==='PAID'&&!!paid.data.paidDate);
  await api('PATCH',`/api/payroll/${record.payrollId}/paid`,undefined,t,[200],'Repeated mark-paid is idempotent');
  const refreshed=await api('GET','/api/payroll?period=2026-11',undefined,t);
  check('Payment survives server refresh',refreshed.data.some(p=>p.payrollId===record.payrollId&&p.status==='PAID'));
  const regenerated=await api('POST','/api/payroll/generate',{period:'2026-11'},t,[200]);
  check('Regeneration preserves paid record and amount',regenerated.data.some(p=>p.payrollId===record.payrollId&&p.status==='PAID'&&p.netSalary===paid.data.netSalary));
  const dept=(await api('POST','/api/departments',{departmentName:`QA Vacant ${suffix}`},state.admin,[201])).data;
  const job=(await api('POST','/api/jobs',{departmentId:dept.departmentId,jobTitle:'Vacant QA position'},state.admin,[201])).data;
  await api('DELETE',`/api/departments/${dept.departmentId}`,undefined,state.admin,[409],'Department with vacant jobs returns conflict');
  await api('DELETE',`/api/jobs/${job.jobId}`,undefined,state.admin,[204]);
  await api('DELETE',`/api/departments/${dept.departmentId}`,undefined,state.admin,[204]);
  for(const resource of ['accounts','roles'])for(const method of ['PUT','DELETE'])
    await api(method,`/api/${resource}/2147483647`,method==='PUT'?(resource==='accounts'?{userName:'missing',email:'missing@example.test',status:'ACTIVE',roleId:1}:{roleName:'missing',description:'missing'}):undefined,state.admin,[404],`${resource} ${method} missing target is 404`);
});
await group('Leave schema and unlinked admin review',async()=>{
  const e=state.EMPLOYEE;
  await api('POST','/api/leaves',{leaveType:'Annual Leave',startDate:'2026-11-14',endDate:'2026-11-15',reason:'Weekend only'},e.token,[400],'Weekend-only leave rejected');
  const request=await api('POST','/api/leaves',{leaveType:'Annual Leave',startDate:'2026-12-01',endDate:'2026-12-03',reason:'QA working day count'},e.token,[201],'UI leave label maps to leave type');
  const id=request.data.leaveId;
  if(!id)throw Error('Leave creation failed');
  const days=Number(execFileSync('docker',['exec','-i','hrms-qa-qa-db-1','psql','-U','qa','-d','hrmsqa','-At','-v','ON_ERROR_STOP=1'],{input:`SELECT day_portion FROM tbl_leave WHERE leave_id=${id};`,encoding:'utf8'}).trim());
  check('Multi-day leave stores actual working days',days===3,`days=${days}`);
  const approval=await api('PATCH',`/api/leaves/${id}/approve`,undefined,state.admin,[200],'Admin without employee link approves leave');
  check('Unlinked leave reviewer is recorded',approval.data.approvedByName==='qa.admin');
});
await group('Reports and authenticated reads',async()=>{
  const docs=(await (await fetch(base+'/docs/all/openapi.json')).json());
  const vals={id:'1',employeeId:String(state.EMPLOYEE.employee.employeeId),departmentId:String(state.dept.departmentId),jobId:String(state.job2.jobId),attendanceId:String(state.attendance.attendanceId),leaveId:String(state.leave.leaveId),period:'2026-11-01',attendanceDate:today,status:'ACTIVE',leaveType:'ANNUAL'};
  for(const [template,ops] of Object.entries(docs.paths)) {
    if(!ops.get||!template.startsWith('/api/report/'))continue;
    let path=template.replace(/\{(\w+)\}/g,(_,key)=>vals[key]||'1');
    if(template.includes('/attendance/status/'))path=path.replace('/ACTIVE','/PRESENT');
    if(template.includes('/leaves/status/'))path=path.replace('/ACTIVE','/APPROVED');
    if(path.endsWith('/range'))path+='?startDate=2026-11-01&endDate=2026-11-30';
    await api('GET',path,undefined,state.admin,template.endsWith('/{id}')?[200,404]:[200],`Report ${template}`);
  }
});
await group('Automation jobs',async()=>{
  for(const name of ['DailyAttendanceSyncJob','ContractExpiryJob','WeeklyReportJob','MonthlyPayrollJob']) {
    await api('POST',`/api/v1/jobs/${name}/trigger`,undefined,state.admin,[202],`Trigger ${name} in isolated copy`);
  }
  const history=await api('GET','/api/v1/jobs/history',undefined,state.admin);
  check('Job history returned',Array.isArray(history.data)&&history.data.length>=4);
  fs.writeFileSync(new URL('./qa-job-history-results.json',import.meta.url),JSON.stringify(history.data,null,2));
  for(let attempt=0;attempt<15;attempt++) {
    const response=await fetch(base+'/api/v1/jobs/history',{headers:{Authorization:`Bearer ${state.admin}`}});
    const jobs=await response.json();
    const latest=['DailyAttendanceSyncJob','ContractExpiryJob','WeeklyReportJob','MonthlyPayrollJob'].map(name=>jobs.find(j=>j.jobName===name));
    if(latest.every(j=>j&&j.status!=='STARTED')||attempt===14) {
      for(const job of latest)check(`${job?.jobName} completes`,job?.status==='COMPLETED',job?.errorMessage||job?.status);
      fs.writeFileSync(new URL('./qa-job-history-results.json',import.meta.url),JSON.stringify(latest,null,2));break;
    }
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  await api('POST','/api/v1/jobs/UnknownJob/trigger',undefined,state.admin,[400],'Unknown job rejected');
  const inbox=await(await fetch(mail+'/api/v1/messages')).json();
  check('Weekly report email delivered to test inbox',inbox.messages.some(m=>m.Subject.startsWith('HRMS weekly report:')&&m.To.some(t=>t.Address==='hr-reports@hrms.local')));
  check('Contract alert email delivered to test inbox',inbox.messages.some(m=>m.Subject.startsWith('HRMS contract expiry alerts:')));
});
await group('Account administration and password reset',async()=>{
  const e=state.HR_STAFF;
  await api('PUT',`/api/accounts/${e.account.accountId}`,{userName:e.username,email:e.email,status:'INACTIVE',roleId:state.roles.find(r=>r.roleName==='HR_STAFF').roleId},state.admin,[200],'Deactivate fixture account');
  await api('GET','/api/auth/me',undefined,e.token,[401],'Inactive account /me rejected');
  await api('GET','/api/employees',undefined,e.token,[401,403],'Inactive account token cannot access business data');
  await api('PUT',`/api/accounts/${e.account.accountId}`,{userName:e.username,email:e.email,status:'ACTIVE',roleId:state.roles.find(r=>r.roleName==='HR_STAFF').roleId},state.admin,[200],'Reactivate fixture account');
  await api('PUT','/api/auth/reset-password',{userName:e.username,newPassword:'Qa-Reset-2026!'},state.admin,[200],'Admin resets fixture password');
  await api('POST','/api/auth/login',{userName:e.username,password:newPassword},undefined,[401],'Old password rejected after reset');
  const resetToken=await login(e.username,'Qa-Reset-2026!',e.email);
  await api('GET','/api/employees',undefined,resetToken,[403],'Reset password requires change');
  await api('PUT','/api/auth/change-password',{oldPassword:'Qa-Reset-2026!',newPassword:'Qa-Final-2026!'},resetToken,[200],'Complete reset password change');
  await api('DELETE',`/api/accounts/${e.account.accountId}`,undefined,state.admin,[200],'Delete fixture account');
  await api('GET',`/api/accounts/${e.account.accountId}`,undefined,state.admin,[404],'Deleted account not found');
  await api('POST','/api/admin/config/refresh',undefined,state.admin,[200],'Refresh config');
});
// Rules the redesigned frontend relies on (feature/evergreen-ui).
await group('Evergreen UI features',async()=>{
  const hr=state.HR_MANAGER,e=state.EMPLOYEE,empId=e.employee.employeeId;
  // App settings are public; reloading them is ADMIN only
  const cfg=await api('GET','/api/public/config',undefined,undefined,[200],'Public frontend config needs no token');
  check('Public config has feature switches and limits',typeof cfg.data?.features==='object'&&Number(cfg.data?.limits?.passwordMinLength)>0);
  await api('POST','/api/admin/config/refresh',undefined,hr.token,[403],'HR cannot reload gateway config');
  // Job history: own only for employees, anyone for HR
  await api('GET',`/api/employees/${empId}/job-history`,undefined,e.token,[403],'Employee cannot read job history by id');
  await api('GET',`/api/employees/${empId}/job-history`,undefined,hr.token,[200],'HR reads an employee job history');
  const mine=await api('GET','/api/employees/me/job-history',undefined,e.token,[200],'Employee reads own job history');
  check('Own job history returned',Array.isArray(mine.data)&&mine.data.length>=1);
  // Self-service contact details: own record only, HR-owned fields untouched
  const contact={phoneNumber:'+855 12 345 678',address:'Phnom Penh',emergencyContactName:'QA Parent',emergencyContactPhone:'012 999 888',emergencyContactRelation:'Parent'};
  const mineContact=await api('PATCH','/api/employees/me/contact',contact,e.token,[200],'Employee updates own contact details');
  check('Contact details saved, HR fields unchanged',mineContact.data?.phoneNumber===contact.phoneNumber&&mineContact.data?.email===e.email&&mineContact.data?.firstName==='QA');
  await api('PATCH','/api/employees/me/contact',{...contact,phoneNumber:'call me maybe'},e.token,[400],'Invalid phone number rejected');
  await api('PATCH',`/api/employees/${empId}`,{...e.request,phoneNumber:'000'},e.token,[403],'Employee cannot edit employee records');
  const asHr=await api('GET',`/api/employees/${empId}`,undefined,hr.token,[200],'HR sees updated contact details');
  check('HR view shows the new phone number',asHr.data?.phoneNumber===contact.phoneNumber);
  // Job title editing: HR manager yes, employee no
  const edited=`QA Senior Edited ${suffix}`;
  await api('PATCH',`/api/jobs/${state.job2.jobId}`,{departmentId:state.dept.departmentId,jobTitle:edited,description:'Edited by HR'},hr.token,[200],'HR manager edits job title');
  await api('PATCH',`/api/jobs/${state.job2.jobId}`,{departmentId:state.dept.departmentId,jobTitle:`QA Hack ${suffix}`},e.token,[403],'Employee cannot edit job title');
  const job=await api('GET',`/api/jobs/${state.job2.jobId}`,undefined,hr.token,[200],'Job lookup by id');
  check('Job title edit persisted',job.data?.jobTitle===edited);
  // Employee photos: any signed-in user, default avatar flagged
  const photo=await fetch(base+`/api/photos/employees/${empId}`,{headers:{Authorization:`Bearer ${e.token}`}});
  check('Employee photo answers with default-avatar flag',photo.status===200&&photo.headers.get('x-default-avatar')!==null,`HTTP ${photo.status}`);
  // Lookups the edit dialogs use to load the latest record
  for (const p of [`/api/accounts/${hr.account.accountId}`,`/api/departments/${state.dept.departmentId}`,`/api/employees/${empId}`,`/api/attendance/${state.attendance.attendanceId}`,`/api/leaves/${state.leave.leaveId}`])
    await api('GET',p,undefined,state.admin,[200],`Lookup ${p.replace(/\/\d+/g,'/{id}')}`);
  const leave=await api('GET',`/api/leaves/${state.leave.leaveId}`,undefined,state.admin);
  check('Decided leave reads as not pending (UI blocks a second decision)',String(leave.data?.status).toUpperCase()!=='PENDING',String(leave.data?.status));
  // Old direct-correction endpoints were removed; corrections go through /api/attendance-requests
  await api('POST',`/api/attendance/${state.attendance.attendanceId}/corrections`,{checkIn:today+'T08:00:00',reason:'old flow'},state.admin,[404,405],'Old direct-correction endpoint removed');
  await api('GET',`/api/attendance/${state.attendance.attendanceId}/corrections`,undefined,state.admin,[404,405],'Old correction-history endpoint removed');
  // Roles: system roles protected, custom roles manageable, ADMIN only
  const adminRole=state.roles.find(r=>r.roleName==='ADMIN');
  await api('GET',`/api/roles/${adminRole.roleId}`,undefined,state.admin,[200],'Role lookup by id');
  await api('PUT',`/api/roles/${adminRole.roleId}`,{roleName:'SUPER_ADMIN',description:adminRole.description},state.admin,[409],'System role cannot be renamed');
  await api('PUT',`/api/roles/${adminRole.roleId}`,{roleName:'ADMIN',description:adminRole.description},state.admin,[200],'System role description can be saved');
  await api('DELETE',`/api/roles/${state.roles.find(r=>r.roleName==='HR_STAFF').roleId}`,undefined,state.admin,[409],'System role cannot be deleted');
  const code=`QA_LEAD_${suffix}`;
  await api('POST','/api/roles',{roleName:code,description:'QA custom role'},state.admin,[200],'Create custom role');
  const custom=(await api('GET','/api/roles',undefined,state.admin)).data.find(r=>r.roleName===code);
  await api('PUT',`/api/roles/${custom.roleId}`,{roleName:code+'_X',description:'Renamed'},state.admin,[200],'Rename custom role');
  await api('DELETE',`/api/roles/${custom.roleId}`,undefined,state.admin,[200],'Delete unused custom role');
  await api('GET','/api/roles',undefined,hr.token,[403],'HR cannot manage roles');
  // Filtered reports used by the Reports page
  for (const p of ['/api/report/employees/status/ACTIVE',`/api/report/employees/department/${state.dept.departmentId}`,`/api/report/employees/job/${state.job2.jobId}`,
    `/api/report/attendance/date/${today}`,`/api/report/attendance/employee/${empId}`,'/api/report/attendance/status/LATE',
    '/api/report/leaves/range?startDate=2026-11-01&endDate=2026-11-30','/api/report/leaves/status/APPROVED','/api/report/leaves/type/ANNUAL',`/api/report/leaves/employee/${empId}`,
    '/api/report/payroll/date/2026-11-01','/api/report/payroll/range?startDate=2026-11-01&endDate=2026-11-30',`/api/report/payroll/employee/${empId}`])
    await api('GET',p,undefined,hr.token,[200],`HR filtered report ${p.split('?')[0]}`);
  await api('GET','/api/report/employees',undefined,e.token,[403],'Employee cannot read reports');
});
console.log(`TOTAL ${results.length}, PASSED ${results.filter(r=>r.passed).length}, FAILED ${results.filter(r=>!r.passed).length}`);
process.exitCode=results.some(r=>!r.passed)?1:0;
