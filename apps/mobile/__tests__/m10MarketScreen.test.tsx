import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { MarketState, MarketReadResponse } from '@retail/contracts';

import { MarketPricesScreen } from '../src/screens/market/MarketPricesScreen';
import type { MarketClient } from '../src/market/client';
import MoreScreen from '../app/(tabs)/more';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), router: { push: mockPush }, useFocusEffect: jest.fn() }));

it('shows honest default OFF, no fabricated numerics and separate personal history', () => {
  const screen = render(<MarketPricesScreen />);
  expect(screen.getByText(/Contribution OFF.*Nothing is sent/)).toBeTruthy();
  expect(screen.queryByText(/Enable prospective/)).toBeNull();
  expect(screen.getByText(/No market result is available/)).toBeTruthy();
  fireEvent.press(screen.getByText('View personal price history'));
  expect(mockPush).toHaveBeenCalledWith('/(tabs)/products/price-changes');
});

const id=(n:number) => `00000000-0000-4000-8000-${n.toString().padStart(12,'0')}`;
const zone={ id:id(6),name:'Synthetic zone',countryCode:'NG',currencyCode:'NGN',version:1 };
const state: MarketState={ policyVersion:1,storeId:id(1),available:true,enabled:true,version:1,generation:1,
  zone,enabledAt:'2026-10-01T06:00:00.000Z',cutoffRevision:1,serverTime:'2026-10-03T06:00:00.000Z',zones:[zone] };
const response: MarketReadResponse={ policyVersion:1,storeId:id(1),controlVersion:1,generation:1,zone,currencyCode:'NGN',revision:1,
  serverTime:'2026-10-03T06:00:00.000Z',results:[{ key:{ productVariantId:id(3),packageUnitId:id(4) },mappingVersion:1,
    marketVariantId:id(7),marketPackageId:id(8),packageName:'Synthetic package',status:'AVAILABLE',minimum:{ numerator:'100',denominator:'1' },
    median:{ numerator:'150',denominator:'1' },maximum:{ numerator:'200',denominator:'1' },observationCount:5,coverage:'LIMITED',windowDays:30,
    windowStart:'2026-09-03T06:00:00.000Z',observedThrough:'2026-10-02T06:00:00.000Z',calculatedAt:'2026-10-03T06:00:00.000Z',validUntil:'2026-10-04T06:00:00.000Z' }] };
function syntheticClient(status: 'SAVED'|'EXPIRED'|'INSUFFICIENT'|'PENDING'|'CONFLICT') : MarketClient {
  const result=status==='INSUFFICIENT' ? { key:response.results[0].key,mappingVersion:1,marketVariantId:id(7),marketPackageId:id(8),packageName:'Synthetic package',status:'INSUFFICIENT_DATA' as const } : response.results[0];
  return {
    available:true,getControl:() => ({ acknowledgement:state,localOff:status==='PENDING',disableRequested:false,epoch:1,cacheRevision:1,cacheContext:'synthetic',
      message:status==='CONFLICT' ? 'Conflict. Review confirmed state.' : null,pending:status==='PENDING' ? {
        policyVersion:1,storeId:id(1),deviceId:id(2),operationId:id(9),expectedVersion:1,enabled:false,zoneId:null } : null }),
    getSaved:() => status==='PENDING' || status==='CONFLICT' ? [] : [{ status:status==='EXPIRED'?'EXPIRED':'SAVED',result,response }],
    reconcile:jest.fn(async () => {}),requestControl:jest.fn(async () => {}),retryPending:jest.fn(async () => {}),
    queueDisable:jest.fn(),refresh:jest.fn(async () => {}),getProducts:() => [],
  };
}
it.each(['SAVED','EXPIRED','INSUFFICIENT','PENDING','CONFLICT'] as const)('renders honest accessible %s fixture state',async status => {
  const screen=render(<MarketPricesScreen client={syntheticClient(status)} storeName="Synthetic store" />);
  fireEvent.press(screen.getByText('Read confirmed state (online)'));
  await waitFor(() => expect(screen.getByText('Zone: Synthetic zone')).toBeTruthy());
  if (status==='SAVED') {
    expect(screen.getByText('Saved · LIMITED prototype coverage')).toBeTruthy();
    expect(screen.getByText('Range: NGN 1.00 to NGN 2.00')).toBeTruthy();
    expect(screen.getByText(/5 representative observations from 5 distinct/)).toBeTruthy();
  } else {
    expect(screen.queryByText(/Range:/)).toBeNull();
    if(status==='EXPIRED') expect(screen.getByText(/Expired saved result/)).toBeTruthy();
    if(status==='INSUFFICIENT') expect(screen.getByText(/Insufficient data: at least five/)).toBeTruthy();
    if(status==='PENDING') expect(screen.getByText(/pending server confirmation/)).toBeTruthy();
    if(status==='CONFLICT') expect(screen.getByText('Conflict. Review confirmed state.')).toBeTruthy();
  }
  expect(screen.getByRole('checkbox',{ name:'I understand prospective market contribution' }).props.accessibilityState.checked).toBe(false);
});
it('More links to the compact market route',() => {
  const screen=render(<MoreScreen />);
  fireEvent.press(screen.getByText('Market prices'));
  expect(mockPush).toHaveBeenCalledWith('/market-prices');
});

it('C2 identifies two local products with the same package name by exact keys',async () => {
  const client=syntheticClient('SAVED');
  const first=client.getSaved()[0];
  const second={ ...first,result:{ ...first.result,key:{ productVariantId:id(30),packageUnitId:id(31) } } };
  const getProducts=jest.fn(() => [
    { ...first.result.key,name:'Synthetic Fanta',packageName:'each' },
    { ...second.result.key,name:'Synthetic Rice',packageName:'each' },
  ]);
  client.getProducts=getProducts;
  client.getSaved=() => [first,second];
  const screen=render(<MarketPricesScreen client={client} />);
  fireEvent.press(screen.getByText('Read confirmed state (online)'));
  await waitFor(() => expect(screen.getAllByText(/Range:/)).toHaveLength(2));
  expect(screen.getByText(/Synthetic Fanta.*each/)).toBeTruthy();
  expect(screen.getByText(/Synthetic Rice.*each/)).toBeTruthy();
  fireEvent.press(screen.getByText('Refresh up to 100 package results (online)'));
  await waitFor(() => expect(client.refresh).toHaveBeenCalledWith([first.result.key,second.result.key]));
  expect(JSON.stringify((client.refresh as jest.Mock).mock.calls)).not.toMatch(/Synthetic Fanta|Synthetic Rice|each/);
  await waitFor(() => expect(screen.getByRole('button',{ name:'Read confirmed market state' }).props.accessibilityState.disabled).toBe(false));
  getProducts.mockReturnValue([]);
  fireEvent.press(screen.getByText('Read confirmed state (online)'));
  await waitFor(() => expect(client.reconcile).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(getProducts).toHaveLastReturnedWith([]));
  await waitFor(() => expect(screen.queryByText(/Synthetic Fanta/)).toBeNull());
  expect(screen.getAllByText(/Local product unavailable/)).toHaveLength(2);
});

it.each(['missing','wrong-package','wrong-variant'] as const)('C2 never borrows a %s local label for a saved result',async kind => {
  const client=syntheticClient('SAVED');
  client.getProducts=() => kind==='missing' ? [] : [{
    productVariantId:kind==='wrong-variant' ? id(30) : response.results[0].key.productVariantId,
    packageUnitId:kind==='wrong-package' ? id(31) : response.results[0].key.packageUnitId,
    name:'Unrelated private product',packageName:'Unrelated private package',
  }];
  const screen=render(<MarketPricesScreen client={client} />);
  fireEvent.press(screen.getByText('Read confirmed state (online)'));
  await waitFor(() => expect(screen.getByText(/Local product unavailable.*Synthetic package/)).toBeTruthy());
  expect(screen.queryByText(/Unrelated private/)).toBeNull();
});
