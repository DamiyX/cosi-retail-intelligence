import { MarketPricesScreen } from '../src/screens/market/MarketPricesScreen';
import { useDatabase } from '../src/db/DatabaseContext';
import { resolvePilotOwner } from '../src/sync/pilot';

export default function MarketPricesRoute() {
  const context = resolvePilotOwner(useDatabase());
  return <MarketPricesScreen storeName={context?.storeName ?? 'No active owner store'} />;
}
