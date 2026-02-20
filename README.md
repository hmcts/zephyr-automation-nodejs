# @hmcts/zephyr-automation-nodejs

Node.js library for Zephyr automation in HMCTS projects.

## Overview

This package provides utilities and a custom Mocha reporter to generate, merge, and manage Zephyr-compatible JSON test reports for use in HMCTS projects. It is designed to be used with Cypress and Mocha test suites.

## Features
- **ZephyrReporter**: Custom Mocha reporter that outputs Zephyr-compatible JSON reports.
- **Report merging**: Utilities to merge multiple Zephyr JSON reports, with deduplication and thread-awareness.
- **Report cleaning**: Utility to clean up Zephyr report directories.

## Installation

```
yarn add @hmcts/zephyr-automation-nodejs
# or
npm install @hmcts/zephyr-automation-nodejs
```

## Usage

### ZephyrReporter (Mocha)

Add the reporter to your Mocha configuration or CLI:

```
mocha --reporter @hmcts/zephyr-automation-nodejs/dist/cypress/ZephyrReporter.js
```

Or in your Cypress plugins (if using programmatically):

```js
const { ZephyrReporter } = require('@hmcts/zephyr-automation-nodejs/dist/cypress/ZephyrReporter');
```

### Report Utilities

Import and use the utilities in your scripts:

```ts
import { mergeZephyrReports, cleanZephyrReports } from '@hmcts/zephyr-automation-nodejs';

mergeZephyrReports({ rootDir: '<Your output directory>', dedupe: true });
cleanZephyrReports({ rootDir: '<Your output directory>' });
```

#### Options
- `rootDir`: Root directory containing Zephyr reports (e.g. `<Your output directory>`).
- `dedupe`: (optional) Deduplicate tests when merging reports.
- `allowMergeOnAllThreads`: (optional) Allow merging on any thread (default: only on thread 1).

## API

### ZephyrReporter
A Mocha reporter that outputs Zephyr-compatible JSON reports. Output files are written to `<Your output directory>/zephyr/temp/` by default.

### mergeZephyrReports(options)
Merges all Zephyr JSON reports in the specified directory into a single report.

### cleanZephyrReports(options)
Removes all Zephyr report files from the specified directory.

## Development

- Build: `yarn build`
- Lint: `yarn lint`
- Test: (add your test instructions here)

## Updating the zephyr-automation-independent jar
To update the `zephyr-automation-independent` jar, follow these steps:
1. Update [pom.xml](scripts/tools/zephyr/pom.xml) with the new version of the tool
2. Run [fetch-jar.sh](scripts/fetch-jar.sh)
3. Commit the updated jar file in `scripts/tools/zephyr/zephyr-automation-independent.jar` and push to the repository.
4. Update the version of `@hmcts/zephyr-automation-nodejs` in `package.json` and publish a new version.


## License

MIT License. See [LICENSE](./LICENSE) for details.

## Contributing

Contributions are welcome! Please open issues or pull requests on [GitHub](https://github.com/hmcts/zephyr-automation-nodejs).

