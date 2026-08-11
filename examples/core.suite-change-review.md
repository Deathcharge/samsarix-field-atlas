# Samsarix Field Atlas declared change review

- Intent gate: **pass**
- Status: **matched**
- Review date: `2026-08-08`
- Plan owner assertion: Samsarix Platform Contracts
- Plan reference: urn:samsarix:field-atlas:example:tag-rollout
- Plan expires: `2026-09-01`
- Plan SHA-256: `a988a71fcf60ce7a830fcb64a26dca0775c9662b41f34648dc5cb3f0f1898dac`
- Baseline SHA-256: `52994c82ddadbde841ebf5abfd7ef6b1a057dfea67186b26d7827fd680728f87`
- Candidate SHA-256: `3a8f7be1558ea8f5ef215f5f841e1ad49fd3d41f37cc4dfc7c1fe1061ef1786e`
- Original comparison: review; regression gate pass
- Planned suite ID: core-reference-scenarios
- Baseline suite ID: core-reference-scenarios
- Candidate suite ID: core-reference-scenarios
- Suite identity bound: yes
- Planned baseline SHA-256: `52994c82ddadbde841ebf5abfd7ef6b1a057dfea67186b26d7827fd680728f87`
- Baseline bytes bound: yes
- Expired: no

## Coverage

| Expected | Actual | Matched | Mismatched | Unexpected | Missing |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 1 | 0 | 0 | 0 |

Regression acknowledgements: 0/0.

## Suite-level signals

| Signal | Expected | Actual | Match |
| --- | --- | --- | --- |
| Report impact | none | none | yes |
| Suite metadata changed | no | no | yes |
| Policy changed | no | no | yes |
| Manifest changed | yes | yes | yes |

## Case declarations

| Case | Disposition | Expected | Actual | Dimensions | Regression acknowledged | Mismatches |
| --- | --- | --- | --- | --- | --- | --- |
| incident | matched | modified/review | modified/review | tags | no | none |

## Proof boundary

Field Atlas matched one bounded owner-asserted change plan against a deterministic local suite comparison as of the supplied date. It did not verify the date, authenticate the owner, authorize an exception, execute contracts, or approve a release; repository review and access controls remain authoritative.
