# Completion Contract

Call the demo complete only when all applicable checks have real evidence:

- The requested meaningful interaction works in the running app.
- The artifact lives in one newly generated `apps/<slug>` workspace and no existing app was overwritten.
- A second meaningful input and one empty, invalid, denied, or offline path were exercised.
- Automated tests, formatting, linting, types, and production build pass, or exact pre-existing failures are reported.
- Keyboard and phone-width use were checked.
- Browser console errors and failed requests were inspected.
- The final response includes the live local URL and keeps the server running.
- The final response names the generated app directory.
- Every screenshot, recording, result, and limitation reported was actually observed.

Do not substitute code inspection for runtime proof when browser tools are available. Do not claim remote publication for a local URL.
