# Zephyr Automation Node.js Library

Node.js library for Zephyr automation in HMCTS projects.

## Installation

```sh
yarn add @hmcts/zephyr-automation-nodejs
```

## Usage

Import the Zephyr reporter or merge utility in your Node.js project:

```js
import { ZephyrReporter, mergeZephyrReports } from '@hmcts/zephyr-automation-nodejs/cypress';
```

- `ZephyrReporter`: Custom Mocha reporter for Zephyr-compatible JSON output.
- `mergeZephyrReports`: Utility to merge multiple Zephyr JSON reports.

## Build

```sh
yarn build
```

## Lint

```sh
yarn lint
```

## License

MIT

