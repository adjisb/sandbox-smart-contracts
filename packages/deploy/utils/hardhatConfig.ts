import {HardhatUserConfig} from 'hardhat/types';
import path from 'path';
import {traverse} from 'hardhat-deploy/dist/src/utils';
import fs from 'fs';

export function nodeUrl(networkName: string): string {
  if (networkName) {
    const uri = process.env['ETH_NODE_URI_' + networkName.toUpperCase()];
    if (uri && uri !== '') {
      return uri;
    }
  }

  let uri = process.env.ETH_NODE_URI;
  if (uri) {
    uri = uri.replace('{{networkName}}', networkName);
  }
  if (!uri || uri === '') {
    // throw new Error(`environment variable "ETH_NODE_URI" not configured `);
    return '';
  }
  if (uri.indexOf('{{') >= 0) {
    throw new Error(
      `invalid uri or network not supported by node provider : ${uri}`
    );
  }
  return uri;
}

export function getMnemonic(networkName?: string): string {
  if (networkName) {
    const mnemonic = process.env['MNEMONIC_' + networkName.toUpperCase()];
    if (mnemonic && mnemonic !== '') {
      return mnemonic;
    }
  }

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic || mnemonic === '') {
    return 'test test test test test test test test test test test junk';
  }
  return mnemonic;
}

export function accounts(networkName?: string): {mnemonic: string} {
  return {mnemonic: getMnemonic(networkName)};
}

export function addSourceFiles(initial: HardhatUserConfig, packages: string[]): HardhatUserConfig {
  const scopes = packages.map(x => x.split('/'));
  const dirs = (require.main ? require.main.paths : [])
    .filter(fs.existsSync)
    .map(d =>
      fs.readdirSync(d)
        .map(x => ({
          root: d,
          dir: x,
          package: scopes.find(y => x.startsWith(y[0]))
        }))
        .filter(x => !!x.package))
    .flat();
  let paths: string[] = [];
  for (const d of dirs) {
    const packagePath = path.join(d.dir, ...(d.package ? d.package.slice(1) : []));
    const root = path.join(d.root, packagePath);
    const entries = traverse(root, [], root,
      (name, stats) => !name.startsWith('.') && name != 'node_modules' && (stats.isDirectory() || name.endsWith('.sol'))
    ).filter(x => !x.directory);
    paths = [...paths, ...entries.map(x => path.join(packagePath, x.relativePath))];
  }
  return {
    ...initial,
    dependencyCompiler: {
      ...initial.dependencyCompiler,
      paths: [...(initial.dependencyCompiler && initial.dependencyCompiler.paths || []), ...paths]
    }
  };
}
