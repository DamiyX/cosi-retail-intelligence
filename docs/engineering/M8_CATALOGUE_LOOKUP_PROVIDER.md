# M8-09 catalogue provider review

Reviewed 2026-09-30. This is a source implementation decision, not live-provider or retailer coverage evidence.

| Candidate | Access/cost | Coverage and constraints | Decision |
| --- | --- | --- | --- |
| Open Food Facts | Public read API, no read account or paid subscription required; custom application/version/contact User-Agent required | Volunteer food catalogue; accuracy/completeness unassured. Product requests limited to 15/min/IP. Database ODbL; individual contents Database Contents Licence; images CC BY-SA | Implement a replaceable, disabled adapter. No images, search, uploads or private retailer data |
| Verified by GS1 | Public browser access has a daily limit; API access through GS1 member organizations | Identity/ownership validation; not a freely available public product-details API | No scraping, signup or account/API purchase |

Primary evidence: [OFF API introduction](https://openfoodfacts.github.io/openfoodfacts-server/api/), [OFF licence guidance](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/), [official terms source](https://github.com/openfoodfacts/openfoodfacts-web/blob/main/lang/en/texts/terms-of-use.html), [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), [GS1 API/access explanation](https://support.gs1.org/support/solutions/articles/43000734077-what-is-verified-by-gs1-).

The API introduction currently recommends v3.6; the [OpenAPI source](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/docs/api/ref/api-v3.yaml) still describes v3.4 and a versionless v3 route. This documentation discrepancy is retained. Adapter pins `/api/v3.6/product/{GTIN}.json?fields=code,product_name,brands,quantity`; it accepts only documented successful v3 response statuses and exact validated GTIN equivalence. Live compatibility is unverified. Test-only staging is `world.openfoodfacts.net` with documented public staging credentials, not production; no live or staging barcode request has been made.

Live integration is DISABLED. Repository has no authorized application contact; do not use private committer details. ODbL attribution/share-alike and the implications of retaining and accepting provider data into a private catalogue need explicit review. A separate local suggestion table alone does not establish a licence exemption. API introduction requests application registration/contact, while licence guidance describes contact as nonmandatory; resolve before activation. French original terms prevail over informative English terms.

Proposed minimum exposure is a validated UPC/EAN GTIN only, plus a public application User-Agent and normal network metadata. Provider sees the request IP; no store/user/device identifiers, prices, stock, cost, sales or photos are supplied. Requests are foreground opportunities, one at a time, deduplicated, at most 10/min/device and 100/day/device with persistent budgets; this cannot guarantee a shared NAT stays below provider IP limits. Positive cache seven days, no-result one day, failures five minutes, HTTP 429 at least one hour. Manual retry still respects budgets and cached no-result backoff. Checkout never awaits lookup.

Suggestions display source and product/ODbL links, remain unconfirmed, and only fill actual editable name fields after explicit Use details/Edit. Save uses the established identity command. Size text never changes package conversion. Remote pictures are excluded. A retailer dismissal/correction is persistent and suppresses automatic repeat for that product/code.

Parser rejects response bodies above 32 KiB before JSON parsing and checks declared Content-Length before reading. React Native fetch may buffer an undeclared/chunked response before the parser can reject it; native memory bounds, redirect rejection and custom User-Agent delivery are not proven. These are additional activation checks. The adapter is not claimed ready for live native use merely because fixture tests pass.

Coverage is unmeasured for Nigerian pilot stock. Fanta 5449000011527 and AirPro 6922420651355 have not been fetched; food/nonfood success and label accuracy must not be inferred from fixture tests. Terms/contact approval and a representative staging/live smoke review are required before enabling any provider. No new backend or dependency is introduced.
