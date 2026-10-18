import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { StaffControlsPanel } from '../src/screens/staff/StaffControlsPanel';
import { createStaffControlClient, type StaffControlTransport } from '../src/staff/control';
import { createUser, createStoreMember } from '../src/db/repositories';
import { openCatalogueFixture, testId, countRows } from './catalogueSupport';

function setup(synthetic = false) {
  const f = openCatalogueFixture();
  const actor = { storeId: f.context.store.id, userId: f.context.owner.id, deviceId: f.context.device.id };
  const user = createUser(f.adapter, { id: testId(900), displayName: 'Synthetic staff' });
  const member = createStoreMember(f.adapter, { id: testId(901), storeId: actor.storeId, userId: user.id, role: 'STAFF' });
  const transport: StaffControlTransport = {
    mode: 'SYNTHETIC', authenticatedUserId: actor.userId, online: true,
    async state() { return { protocolVersion: 1, storeId: actor.storeId, deviceId: actor.deviceId, actorUserId: actor.userId, available: true,
      snapshot: { targetMemberId: member.id, targetDeviceId: null, userId: user.id, role: 'STAFF', memberStatus: 'ACTIVE', accountStatus: 'ACTIVE', deviceStatus: null, version: 0 } }; },
    async control() { throw new Error('Synthetic timeout; confirmation unavailable.'); },
  };
  const client = createStaffControlClient(f.adapter, { ...actor, ...(synthetic ? { transport } : {}), generateId: () => testId(950) });
  return { f, member, actor, client };
}

describe('M11 source controls UI with disposable SQLite', () => {
  it('shows shipped unavailable state and disabled controls without making requests', () => {
    const { f, member, client } = setup();
    try {
      render(<StaffControlsPanel client={client} memberId={member.id} name="Synthetic staff" devices={[]} />);
      expect(screen.getByText('Member access changes are unavailable on this build.')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Suspend membership' }).props.accessibilityState.disabled).toBe(true);
      fireEvent.press(screen.getByText('Suspend membership'));
      expect(countRows(f.adapter, 'staff_control_requests')).toBe(0);
    } finally { f.closeAndDelete(); }
  });
  it('requires explicit owner confirmation and retains honest pending state after timeout; clears private receipt view on denial', async () => {
    const { f, member, actor, client } = setup(true);
    const confirmation = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      render(<StaffControlsPanel client={client} memberId={member.id} name="Synthetic staff" devices={[]} />);
      await act(async () => { fireEvent.press(screen.getByText('Read confirmed membership state')); });
      fireEvent.press(screen.getByText('Suspend membership'));
      expect(countRows(f.adapter, 'staff_control_requests')).toBe(0);
      const confirm = confirmation.mock.calls[0][2]?.find(button => button.text === 'Confirm');
      expect(confirm).toBeDefined();
      await act(async () => { confirm?.onPress?.(); });
      expect(screen.getByText('Suspend membership · Pending server confirmation')).toBeTruthy();
      expect(screen.getByText('Synthetic timeout; confirmation unavailable.')).toBeTruthy();
      expect(f.adapter.getFirstRow('SELECT status FROM store_members WHERE id=?;', [member.id])).toEqual({ status: 'ACTIVE' });
      f.adapter.run("UPDATE devices SET status='REVOKED' WHERE id=?;", [actor.deviceId]);
      await act(async () => { fireEvent.press(screen.getByText('Retry pending confirmation')); });
      expect(screen.getByText('Member access review unavailable.')).toBeTruthy();
      expect(screen.queryByText('Suspend membership · Pending server confirmation')).toBeNull();
      expect(screen.queryByText(/Saved server response:/)).toBeNull();
      expect(f.adapter.getFirstRow('SELECT status FROM staff_control_requests;')).toEqual({ status: 'PENDING' });
    } finally { confirmation.mockRestore(); f.closeAndDelete(); }
  });
});
