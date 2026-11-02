import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createCatalogFixture} from '../scripts/catalog-fixture.mjs';

// Regression cases are provided for user verification; not run during this delivery.
test('organization registration policy is persisted and enforced before account creation',async t=>{
 const f=await createCatalogFixture({withPasswordAuth:true});t.after(()=>f.close());
 const password='Registration!'+randomBytes(15).toString('base64url');let settings,invitation;
 const users=async()=>Number((await f.pool.query('SELECT count(*) n FROM users')).rows[0].n);
 const publicCall=async(path,body)=>{const response=await fetch(f.apiUrl+'/v1'+path,{method:body?'POST':'GET',headers:body?{Origin:f.apiUrl,'Idempotency-Key':randomUUID(),'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,headers:response.headers,body:await response.json()};};
 const registration=(username,extra={})=>publicCall('/auth/register',{username,displayName:'注册同事',password,organizationId:f.organizationId,...extra});
 await t.test('existing default requires invitations and a refused direct request writes no user',async()=>{
  settings=(await f.call('admin','GET','/registration-settings')).body;assert.equal(settings.invitationRequired,true);
  const options=await publicCall('/auth/options');assert.equal(options.body.registration,'invitation');assert.deepEqual(options.body.openOrganizations,[]);
  const before=await users(),result=await registration('closed_before');assert.equal(result.status,403);assert.equal(result.body.error.code,'INVITATION_REQUIRED');assert.equal(await users(),before);
 });
 await t.test('non-administrator, AI and other-organization callers cannot open registration',async()=>{
  for(const name of ['developer','ai','outsider']){const result=await f.call(name,'POST','/registration-settings',{invitationRequired:false,expectedRevision:settings.revision});assert.equal(result.status,403);}
  const cross=await f.call('admin','POST','/registration-settings',{invitationRequired:false,expectedRevision:0},{'X-Organization-Id':f.otherOrganizationId});assert.equal(cross.status,403);
  assert.equal((await f.call('admin','GET','/registration-settings')).body.invitationRequired,true);
 });
 await t.test('administrator update persists, publishes only enabled organizations and is idempotent',async()=>{
  const key=randomUUID(),body={invitationRequired:false,expectedRevision:settings.revision};
  const first=await f.call('admin','POST','/registration-settings',body,{'Idempotency-Key':key});assert.equal(first.status,200);settings=first.body;assert.equal(settings.invitationRequired,false);
  const replay=await f.call('admin','POST','/registration-settings',body,{'Idempotency-Key':key});assert.equal(replay.status,200);assert.deepEqual(replay.body,settings);
  const saved=(await f.pool.query('SELECT invitation_required,revision FROM organization_registration_settings WHERE organization_id=$1',[f.organizationId])).rows[0];assert.equal(saved.invitation_required,false);assert.equal(Number(saved.revision),settings.revision);
  const options=await publicCall('/auth/options');assert.equal(options.body.registration,'open');assert.deepEqual(options.body.openOrganizations.map(o=>o.id),[f.organizationId]);
  assert.ok((await f.pool.query("SELECT id FROM audit_logs WHERE organization_id=$1 AND action='updateRegistrationSettings'",[f.organizationId])).rowCount>0);
 });
 await t.test('direct registration creates only the fixed business role and no dataset grants',async()=>{
  const before=await users();for(const extra of [{role:'admin'},{isAdmin:true}])assert.equal((await registration('forged_privilege',extra)).status,400);assert.equal(await users(),before);
  const result=await registration('direct_member');assert.equal(result.status,201);assert.equal(await users(),before+1);
  const account=(await f.pool.query("SELECT user_id FROM password_accounts WHERE username='direct_member'")).rows[0];
  assert.deepEqual((await f.pool.query('SELECT organization_id FROM organization_members WHERE user_id=$1',[account.user_id])).rows.map(r=>r.organization_id),[f.organizationId]);
  assert.equal(Number((await f.pool.query('SELECT count(*) n FROM resource_grants WHERE principal_user_id=$1',[account.user_id])).rows[0].n),0);
  const login=await publicCall('/auth/login',{username:'direct_member',password});assert.equal(login.status,200);assert.equal(login.body.mustChangePassword,false);
  const cookie=login.headers.get('set-cookie').split(';')[0],response=await fetch(f.apiUrl+'/v1/me',{headers:{Cookie:cookie,'X-Organization-Id':f.organizationId}}),me=await response.json();assert.equal(response.status,200);assert.ok(me.permissions.includes('app.develop'));
  for(const permission of ['account.manage','catalog.manage','permission.manage','release.approve','release.deploy'])assert.ok(!me.permissions.includes(permission));
 });
 await t.test('an open organization never enables another tenant or accepts an invalid invitation',async()=>{
  const before=await users();assert.equal((await registration('wrong_org',{organizationId:f.otherOrganizationId})).status,403);
  const invalid=await publicCall('/auth/register',{username:'bad_invitation',displayName:'同事',password,invitationCode:'eas_inv_'+randomBytes(32).toString('base64url')});assert.equal(invalid.status,403);assert.equal(invalid.body.error.code,'INVITATION_INVALID');assert.equal(await users(),before);
  const created=await f.call('admin','POST','/registration-invitations',{label:'正常邀请',role:'viewer',expiresInDays:1});assert.equal(created.status,201);invitation=created.body.code;
 });
 await t.test('re-enabling invitations rejects stale direct requests and keeps the invitation path',async()=>{
  const previous=settings;settings=(await f.call('admin','POST','/registration-settings',{invitationRequired:true,expectedRevision:previous.revision})).body;
  const stale=await f.call('admin','POST','/registration-settings',{invitationRequired:false,expectedRevision:previous.revision});assert.equal(stale.status,409);assert.equal(stale.body.error.code,'REGISTRATION_SETTINGS_CHANGED');
  const before=await users(),direct=await registration('closed_again');assert.equal(direct.status,403);assert.equal(direct.body.error.code,'INVITATION_REQUIRED');assert.equal(await users(),before);
  assert.equal((await publicCall('/auth/options')).body.registration,'invitation');
  const body={username:'invited_member',displayName:'只读同事',password,invitationCode:invitation};assert.equal((await publicCall('/auth/register',body)).status,201);
  const count=await users();assert.equal((await publicCall('/auth/register',{...body,username:'reuse_invitation'})).status,403);assert.equal(await users(),count);
 });
});
