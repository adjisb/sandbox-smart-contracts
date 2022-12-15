# Yarn Workspace Refactor

Yarn workspace allows for more organized monorepos by splitting a traditional monorepo into several smaller packages called workspaces.
For the most part everything is the same as traditional development, but there are a few changes in the directory structure, root package.json, and yarn usage.

Workspaces and a traditional monorepo can live side by side while migrating slowly.

## Folder Structure

In a workspaces monorepo, the folder structure moves from a single massive src to small individual packages:

Before, there was a single `src` directory that contained all the code and a single hardhat and yarn (package.json) configuration for the entire repo:

```shell
root
.
.
.
├── hardhat.config.ts
├── package.json
├── src
│   ├── solc_0.5/...
│   ├── solc_0.6/...
│   └── solc_0.8/...
├── test/...
├── tsconfig.json
└── yarn.lock
```

After, there is a `packages` directory containing many smaller projects each one with its own hardhat and yarn (package.json) configurations.
Additionally, there is a root yarn (package.json) configuration to make running commands from anywhere in the project tree simple:

```shell
root
.
.
.
├── package.json
├── packages
│   ├── sandbox-core // This would be a core package that can be used in any of the other projects/packages
│   │   ├── contracts
│   │   │   ├── ERC-Standards
│   │   │   │   └── ERC2771HandlerV2.sol
│   │   │   └── Libraries
│   │   │       └── SafeMathWithRequire.sol
│   │   ├── hardhat.config.ts
│   │   ├── node_modules
│   │   └── package.json
│   ├── staking
│   │   ├── artifacts
│   │   ├── hardhat.config.ts
│   │   ├── node_modules
│   │   ├── package.json // should contain a dependancy for sandbox-core
│   │   └── src
│   │       ├── ERC20RewardPool.sol
│   │       ├── StakeTokenWrapper.sol
│   │       ├── interfaces
│   │       │   ├── IContributionCalculator.sol
│   │       │   ├── IContributionRules.sol
│   │       │   └── IRewardCalculator.sol
│   │       ├── rewardCalculation
│   │       │   └── TwoPeriodsRewardCalculator.sol
│   │       └── rules
│   │           ├── ContributionRules.sol
│   │           ├── LockRules.sol
│   │           └── RequirementsRules.sol
│   ├── projectB
│   │   ├── artifacts
│   │   ├── hardhat.config.ts
│   │   ├── node_modules
│   │   ├── package.json
│   │   └── src
│   └── projectC
│       ├── artifacts
│       ├── hardhat.config.ts
│       ├── node_modules
│       ├── package.json
│       └── src
├── test/...
├── tsconfig.json
└── yarn.lock
```

## Updates

### Root package.json

```json
  "private": true, // This is to prevent publishing a workspace as a yarn package as they are meant to stay private
  "workspaces": { // Enables workspaces
    "packages": [ // List to tell yarn what directories should be interpreted as workspaces
        "packages/*"
    ]
  },
  .
  .
  .
  "scripts":{
    "staking:compile": "yarn workspace staking compile", // root level scripts should use "yarn workspace <workspace_name> <command>" to run commands from anywhere in the project tree
    "staking:test": "yarn workspace staking test"
  }
```

### Code and dependancies

Each new project could be its own package under the `packages` directory containing its source code, package.json, hardhat.config.ts, and tests.
If a project relies on another, it can specify the package in its own package.json.

You'll notice that this structure creates a `node_modules` folder for each project **and** at the root repo level. Workspaces use symbolic links to prevent installing the same dependencies multiple times, so most of the dependencies in a project will be linked to the root `node_modules`.

## Usage

You can run normal yarn scripts from a package's directory:

```shell
/the-sandbox/packages/staking> yarn run test
```

You can run yarn scripts for a specific package from any* directory:

```shell
/the-sandbox/packages/staking> yarn workspace staking test
```

You can run yarn scripts for all packages from any* directory:

```shell
/the-sandbox/packages/staking> yarn workspaces run test
```

\* There are some known issues with running workspace commands from deep within the directory structure or across packages.
\* Additionally, yarn 1.X has been effectively deprecated since late 2020 and recently was officially marked as frozen [here][freeze-pr] and [here][freeze-readme]. Yarn 2+ (codenamed `berry`) is available with detailed [migration docs][migrate].

<!-- Links -->
[freeze-readme]: https://github.com/yarnpkg/yarn/commit/fbcdb79a9878ef2d6e10e70c97adece2d94fa754
[freeze-pr]: https://github.com/yarnpkg/yarn/commit/158d96dce95313d9a00218302631cd263877d164
[migrate]: https://yarnpkg.com/getting-started/migration
<!-- Links -->
