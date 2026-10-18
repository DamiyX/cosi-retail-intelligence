# Standalone readiness and current host-runtime verification

October 10 coordinator review after founder returned the completed desktop check. Existing writer is STOPPED with lease null while this review runs.

## Readiness evidence

Two saved standalone attempts at 2026-10-09T23:41:05Z and 23:42:50Z report `READINESS_CHECK_PASSED`, exact original runner digest `068d20f476236254b7dfb1c115ea47632beb2a295a0c1e6d77c9de251cd0ca1f`, parent status `LAUNCHED_OUTSIDE_WINDOWS_JOBS`, and the generated `HELPER_SURVIVED_PARENT_EXIT` marker. Coordinator read these actual files, not only the screenshot. No WLAN or photo operation was run. This closes the separate-launch generated readiness prerequisite, not actual Wi-Fi recovery, host/power-failure proof or private recognition acceptance.

The original runner's read-only Plan also passed on the current WLAN binding. Do not launch it from inside Codex's job context; that earlier refusal remains correct.

## Current runtime — new exact review, not historical-byte equivalence

- Host `load_workspace_dependencies` identifies the same Python base path as the configured bundled runtime, bundle version `26.1007.11041`.
- Base executable SHA256 `10d845f50a2af64e3500bb2fcb348b5bc98a75d8ddada63e45ba1da6a1fc79d1`, version 3.12.14, Authenticode Valid, publisher OpenAI OpCo LLC. `python312.dll` (`c19758a4dfccc35b5f4da513945dfab85e70bed8cdbf4bc25587662fa7f457d2`) and `python3.dll` (`afa6cc673944dcb13c91474d51e3c707c7ecc6ab0cc6005bc91e92eb02f488f1`) also have valid OpenAI signatures. Current executable length is 106448; the preparation manifest's 107312 byte field is inaccurate despite the correct digest. Correct that descriptive field in a NEW binding before execution; preserve old manifest evidence.
- Fresh read-only inventory from the existing isolated environment matches the entire original software record SHA256 `3d727c07763d95c0865cd975581a3690e8bbe6718a9eb8f24dd397af6c69989e` exactly.
- Ran the unchanged `observe_generated.py` once on the original generated-only fixture. Exit 0, 1024 features; exact vector, RGB pixels and input-tensor hashes match the original generated result. Fresh original producer suite: 14 total, 13 pass, 1 host symlink privilege skip, exit 0. New logs are under ignored `apps/recognition-lab/runs/exploratory/offline-runtime-review-20261010`; original records untouched.

Decision: current configured signed host-runtime provenance and this exercised functionality are reviewed as a NEW exact snapshot. This is sufficient to prepare a bound operational attempt with unchanged isolated dependencies/model/recipe. The cause of the old executable-byte change remains unknown; no claim of universal historical binary equivalence or inference privacy is made. The generated socket/endpoint observations still do not establish native isolation. No downloads, dependency changes or private inference occurred.

## Next bounded assignment

Resume only the existing GPT-6.1 Sol HIGH writer to prepare a clearly labelled visible Windows launcher for the unchanged offline runner, generated checks and a stopped handoff. Coordinator remains responsible for independent review and final exact E04 records. Writer must not authorize itself, disconnect Wi-Fi or run real photos. Actual isolation checks under the active offline lifetime remain mandatory before and during any eventual private execution. Use phase/elapsed/completed-work evidence rather than fabricated progress percentages. No new mobile app, model, business change or milestone.
