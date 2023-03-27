const util = require(`./util.js`)
const fs = require(`fs`)
const path = require(`path`)
const arch = process.arch
const platform = process.platform

async function binShim({owner, repo, fileListFn, binFileFn, cwd = __dirname}) {
  const saveDir = `${cwd}/lib/${platform}/${arch}/`
  const infoFile = `${saveDir}/info.json`
  fs.existsSync(saveDir) === false && fs.mkdirSync(saveDir, {recursive: true})
  fs.existsSync(infoFile) === false && fs.writeFileSync(infoFile, util.j2s({
    status: ``,
    binFile: ``,
    file: {},
    saveDir: ``,
    downloadPath: ``,
  }))
  const info = new Proxy({}, {
    get(obj, key) {
      return util.noCacheRequire(infoFile)[key]
    },
    set(obj, key, val) {
      const json = util.noCacheRequire(infoFile)
      json[key] = val
      fs.writeFileSync(infoFile, util.j2s(json))
    },
  })
  if(info.status === `ok`) {
    let binFile = fs.existsSync(info.binFile) ? info.binFile : await binFileFn({
      file: info.file,
      saveDir: info.saveDir,
      downloadPath: info.downloadPath,
    })
    binFile = path.isAbsolute(binFile) ? binFile : path.join(cwd, binFile)
    info.binFile = path.relative(cwd, binFile)
    return binFile
  } else {
    // Obtain the download address that matches the platform from the Internet
    const github = new util.Github({
      owner,
      repo,
    })
    const fileList = await fileListFn(github)
    const file = (await util.getMatchFileList({fileList, arch, platform})).sort((a, b) => (b.size - a.size))[0]
  
    // Download to specified location
    const downloadPath = `${saveDir}/${file.name}`
    fs.mkdirSync(saveDir, {recursive: true})
    await util.downloadFile(file.browser_download_url, downloadPath)
    let binFile = await binFileFn({file, saveDir, downloadPath})
    binFile = path.isAbsolute(binFile) ? binFile : path.join(cwd, binFile)
    info.binFile = path.relative(cwd, binFile)
    info.status = `ok`
    info.file = file
    info.saveDir = path.relative(cwd, saveDir)
    info.downloadPath = path.relative(cwd, downloadPath)
    return binFile
  }
}

module.exports = {
  getBinFile: util.getBinFile,
  binShim,
}