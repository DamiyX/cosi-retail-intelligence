import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StaffControlsPanel } from '../src/screens/staff/StaffControlsPanel';
import { createStaffControlClient, type StaffControlTransport } from '../src/staff/control';
import { createDevice, createStoreMember, createUser } from '../src/db/repositories';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';
import { deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

function setup() {
  const f = openCatalogueFixture(), actor = { storeId: f.context.store.id, deviceId: f.context.device.id, userId: f.context.owner.id };
  const members = Array.from({ length: 22 }, (_, i) => {
    const user = createUser(f.adapter, { id: testId(5000 + i * 2), displayName: `Member ${i}` });
    return createStoreMember(f.adapter, { id: testId(5001 + i * 2), storeId: actor.storeId, userId: user.id, role: 'STAFF' });
  });
  const snapshot = (id: string, deviceId: string | null) => ({ targetMemberId: id, targetDeviceId: deviceId, userId: members.find(m => m.id === id)!.userId, role: 'STAFF', memberStatus: 'ACTIVE', accountStatus: 'ACTIVE', deviceStatus: deviceId ? 'ACTIVE' : null, version: 0 });
  const control = jest.fn(async (request: Parameters<StaffControlTransport['control']>[0]) => ({ protocolVersion: 1, actorUserId: actor.userId, request, status: 'CONFLICT', snapshot: snapshot(request.targetMemberId, request.targetDeviceId) }));
  const transport: StaffControlTransport = { mode: 'SYNTHETIC', authenticatedUserId: actor.userId, online: true, control,
    async state(r) { return { protocolVersion: 1, storeId: actor.storeId, deviceId: actor.deviceId, actorUserId: actor.userId, available: true, snapshot: snapshot(r.targetMemberId, r.targetDeviceId) }; } };
  const client = createStaffControlClient(f.adapter, { ...actor, transport, generateId: deterministicIds(20000) });
  const queue = async (memberId: string, deviceId: string | null = null) => { await client.refreshTarget(memberId, deviceId); return client.queueRequest(memberId, deviceId ? 'DEVICE_REVOKE' : 'MEMBER_SUSPEND', deviceId, true).request; };
  return { f, actor, members, client, queue, control, transport };
}

it('actual panel exposes and retries the original pending member operation after more than20 other-member requests', async () => {
  const s = setup(); try {
    const first = await s.queue(s.members[0].id);
    for (const member of s.members.slice(1)) await s.queue(member.id);
    const before = s.f.adapter.getFirstRow<{ request: string }>('SELECT request FROM staff_control_requests WHERE operation_id=?;', [first.operationId])!;
    expect(() => s.client.queueRequest(s.members[0].id, 'MEMBER_SUSPEND', null, true)).toThrow();
    render(<StaffControlsPanel client={s.client} memberId={s.members[0].id} name="Member 0" devices={[]} />);
    expect(screen.getByText('Suspend membership · Pending server confirmation')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByText('Retry pending confirmation')); });
    expect(s.control).toHaveBeenCalledWith(first);
    expect(s.f.adapter.getFirstRow('SELECT operation_id,request,status FROM staff_control_requests WHERE operation_id=?;', [first.operationId])).toEqual({ operation_id: first.operationId, request: before.request, status: 'CONFLICT' });
    expect(s.f.adapter.getFirstRow('SELECT COUNT(*) total FROM staff_control_requests;')).toEqual({ total: 22 });
  } finally { s.f.closeAndDelete(); }
});

it('member request pages retain ID ties and isolate other owners/stores with original intent bytes unchanged', async () => {
  const s = setup(); const clock = jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-10-03T18:00:00.000Z');
  try {
    const requests: Awaited<ReturnType<typeof s.queue>>[] = [];
    const devices = Array.from({ length: 3 }, (_, i) => createDevice(s.f.adapter, { id: testId(32000 + i), storeId: s.actor.storeId, userId: s.members[0].userId, platform: 'ANDROID', appVersion: '0.0.1' }));
    for (const device of devices) requests.push(await s.queue(s.members[0].id, device.id));
    const first = s.client.listMemberRequests(s.members[0].id, { status: 'PENDING', limit: 1 });
    const second = s.client.listMemberRequests(s.members[0].id, { status: 'PENDING', limit: 1, after: first.next! });
    const third = s.client.listMemberRequests(s.members[0].id, { status: 'PENDING', limit: 1, after: second.next! });
    expect([first.rows[0].operationId, second.rows[0].operationId, third.rows[0].operationId]).toEqual(requests.map(r => r.operationId).reverse());
    expect(third.next).toBeNull();
    const peer = createUser(s.f.adapter, { id: testId(33000), displayName: 'Other owner' });
    createStoreMember(s.f.adapter, { id: testId(33001), storeId: s.actor.storeId, userId: peer.id, role: 'OWNER' });
    const device = createDevice(s.f.adapter, { id: testId(33002), storeId: s.actor.storeId, userId: peer.id, platform: 'ANDROID', appVersion: '0.0.1' });
    expect(createStaffControlClient(s.f.adapter, { storeId: s.actor.storeId, userId: peer.id, deviceId: device.id }).listMemberRequests(s.members[0].id).rows).toEqual([]);
    const other = provisionStoreContext(s.f.adapter, { ownerDisplayName: 'Other tenant', storeName: 'Other tenant', currencyCode: 'NGN', countryCode: 'NG', timezone: 'Africa/Lagos', deviceLabel: 'Other', appVersion: '0.0.1' }, { generateId: deterministicIds(34000) });
    const user = createUser(s.f.adapter, { id: testId(35000), displayName: 'Other staff' });
    const member = createStoreMember(s.f.adapter, { id: testId(35001), storeId: other.store.id, userId: user.id, role: 'STAFF' });
    expect(() => s.client.listMemberRequests(member.id)).toThrow();
    expect(() => s.client.listMemberRequests(s.members[0].id, { after: { operationId: requests[0].operationId, createdAt: 'invalid' } })).toThrow();
    expect(s.f.adapter.getAllRows<{ request: string }>('SELECT request FROM staff_control_requests ORDER BY operation_id;').map(r => JSON.parse(r.request))).toEqual(requests);
  } finally { clock.mockRestore(); s.f.closeAndDelete(); }
});

it('bounded pending/member query and real panel page past same-member terminal and pending-device backlogs without losing retry or privacy', async () => {
  const s = setup(); try {
    const first = await s.queue(s.members[0].id);
    const devices = Array.from({ length: 23 }, (_, i) => createDevice(s.f.adapter, { id: testId(30000 + i), storeId: s.actor.storeId, userId: s.members[0].userId, platform: 'ANDROID', appVersion: '0.0.1', deviceLabel: `Device ${i}` }));
    for (const device of devices) { const done = await s.queue(s.members[0].id, device.id); await s.client.sendPending(done.operationId); }
    for (const device of devices) await s.queue(s.members[0].id, device.id);
    const query = s.client.listMemberRequests(s.members[0].id, { status: 'PENDING', limit: 20 });
    expect(query.rows).toHaveLength(20); expect(query.next).not.toBeNull();
    const next = s.client.listMemberRequests(s.members[0].id, { status: 'PENDING', limit: 20, after: query.next! });
    expect(next.rows.map(r => r.operationId)).toContain(first.operationId); expect(next.rows).toHaveLength(4); expect(next.next).toBeNull();
    expect(new Set([...query.rows, ...next.rows].map(r => r.operationId)).size).toBe(24);
    expect(() => s.client.listMemberRequests(s.members[0].id, { limit: 51 })).toThrow();
    expect(() => s.client.listMemberRequests(testId(99999))).toThrow();
    const another = createDevice(s.f.adapter, { id: testId(31000), storeId: s.actor.storeId, userId: s.actor.userId, platform: 'ANDROID', appVersion: '0.0.1' });
    expect(createStaffControlClient(s.f.adapter, { ...s.actor, deviceId: another.id, transport: s.transport }).listMemberRequests(s.members[0].id).rows).toEqual([]);
    render(<StaffControlsPanel client={s.client} memberId={s.members[0].id} name="Member 0" devices={devices.map(d => ({ id: d.id, label: d.deviceLabel!, status: d.status }))} />);
    expect(screen.queryByText('Suspend membership · Pending server confirmation')).toBeNull();
    fireEvent.press(screen.getByText('See more pending requests'));
    expect(screen.getByText('Suspend membership · Pending server confirmation')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getAllByText('Retry pending confirmation').at(-1)!); });
    expect(s.control).toHaveBeenLastCalledWith(first);
    expect(s.f.adapter.getFirstRow('SELECT status FROM staff_control_requests WHERE operation_id=?;', [first.operationId])).toEqual({ status: 'CONFLICT' });
    fireEvent.press(screen.getByText('See more recent requests'));
    expect(screen.getAllByText(/Conflict — review current state/).length).toBeGreaterThan(0);
    s.f.adapter.run("UPDATE users SET status='SUSPENDED' WHERE id=?;", [s.actor.userId]);
    fireEvent.press(screen.getByText('First recent requests'));
    expect(screen.getByText('Member access review unavailable.')).toBeTruthy(); expect(screen.queryByText(/Pending server confirmation/)).toBeNull();
  } finally { s.f.closeAndDelete(); }
});
