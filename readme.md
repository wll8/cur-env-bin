Automatically find files that match the current environment.

Suppose you need to use nodejs to call a binary file, this tool can help you quickly be compatible with various platforms and CPU architectures.

## example

Get the syncthing executable for the current platform:

```js
const decompress = require(`decompress`);
const { binShim, getBinFile } = require(`cur-env-bin`);

const binPath = await binShim({
  cwd: __dirname,
  owner: `syncthing`,
  repo: `syncthing`,
  fileListFn: async (github) => github.byTag(`v1.23.2`),
  async binFileFn({ file, saveDir, downloadPath }) {
    const decompressDir = `${saveDir}/file`;
    await decompress(downloadPath, decompressDir, { strip: 1 });
    return getBinFile({ dir: decompressDir, name: `syncthing` });
  },
});

require(`child_process`).execSync(binPath, { stdio: `inherit` });
```

## Allow configuration of proxy

```sh
# win
set http_proxy=http://127.0.0.1:1081

# linux
export http_proxy=http://127.0.0.1:1081
```

## license

MIT