const util = require(`./util.js`)
const fs = require(`fs`)
const path = require(`path`)
const arch = process.arch
const platform = process.platform

async function binShim({owner, repo, fileListFn, binFileFn}) {
  const saveDir = `./lib/${platform}/${arch}/`
  const okTag = `${saveDir}/ok.txt`
  if(fs.existsSync(okTag)) {
    return fs.readFileSync(okTag, `utf8`)
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
    binFile = path.join(__dirname, binFile)
    fs.writeFileSync(okTag, `${binFile}`)
    return binFile
  }
}

module.exports = {
  getBinFile: util.getBinFile,
  binShim,
}