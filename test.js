process.env.http_proxy = `http://127.0.0.1:1081`

void(async () => {
  const decompress = require(`decompress`)
  const { binShim, getBinFile } = require(`./index.js`)
  
  const binPath = await binShim({
    owner: `syncthing`,
    repo: `syncthing`,
    fileListFn: async (github) => github.byTag(`v1.23.2`),
    async binFileFn({file, saveDir, downloadPath}) {
      const decompressDir = `${saveDir}/file`
      await decompress(downloadPath, decompressDir, {strip: 1})
      return getBinFile({dir: decompressDir, name: `syncthing`})
    },
  })
  require(`child_process`).execSync(binPath, {stdio: `inherit`})
})()
