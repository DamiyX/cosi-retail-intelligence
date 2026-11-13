/** Exact source665 canonical references from independently reviewed immutable R03. */
export const retainedReferenceReport = '5360c9b20d4ee50e20fcffb5b1b5f5c6c50137a047b61b934e6a031681017fce';
const source = '030552c6d7625087a38f578d37c7b338fe5fa43ea61407bcfc0692e519eef294';
const refs: Record<number, readonly [number, number, number, string, string]> = {
 1: [0, 0, 1, 'c96cf92afcb88063a999f21c732cef1b507c9ee9db52a274c41f71141b5838eb', '6653678bdf03de49547a0a06fe0170d103f53b032daae9382c93478a7d36e3b1'],
 3: [0, 1, 4, '4756f1eecf89825be3e752c2e49c54c18aaf9157eadde6d23edf7769e8cd495f', '427b3fb5bc0cca8fc9fd6bf7e60e1ee4e1f7dbabd3f6638f22c8bcbfbd805a03'],
 4: [0, 1, 5, 'dca0c68f9a8e0c6ca116605adc444c1e49208a45074c132ad8597baf1d847718', '4c6f91b6ee38ffaffa6a802e0273f0237849d4950467a41937359a38cc9f1384'],
 5: [0, 1, 6, '06887722171d55d824774bff7ba622243bd847bf234969d8634a269a0dbd0022', '7b80951cc6b0a1b860bfd8fcc5ad4bfd8737a43fb053f35d11ba3e89ccca8047'],
 6: [0, 2, 7, 'e7620b4e05b34da24ea818cb570061a29ec99e4568fb618f77dc789829833735', '181494168ee2cf54b6889e1e19cd685b2961b0fa6f2895cc9a2bc063b4a604b0'],
 7: [0, 3, 8, '25b058b753ef7f063dc3a785e27bad1458989d81d1fecb3f6c2ecd745ab84e46', 'dd9e0048f29f5ce9a75c57f07900ad1643c8b8c94af65285eaedc786c4032f3c'],
 8: [0, 0, 9, '6df0c7c206e294c747608ce9517ff7a4c8c15cd13e0f650f035cb64ae8d15938', 'cf6bb91f77db8acab141d925f544d266b7a64b7a4684de3708a07241a4989f15'],
};
export function retainedReference(ref: { job: number; product: number; view: number; epoch: number; receipt: string; source: string; bindingSha256: string }, session: string, descriptorSource: string, roster: string): boolean {
 const row = refs[ref.job];
 return session === 'enrollment-mw4zmxro' && descriptorSource === '3d9ad3427b4f192d1a3cf8f918e1403ff8e3d82fe803724cca4541d033d11a4f' && roster === 'b4ebbcf8994c2a44b11a650971ce0f23e12a181c3d5f0ef75010df6fac33e26c' && ref.source === source && !!row && row[0] === ref.product && row[1] === ref.view && row[2] === ref.epoch && row[3] === ref.receipt && row[4] === ref.bindingSha256;
}
