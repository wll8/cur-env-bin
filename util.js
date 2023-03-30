const os = require(`os`)
const fs = require(`fs`)


const http = require('./http.js')

/**
 * The alias corresponding to os.platform
 */
const platformList = [
  {
    name: `aix`,
    alias: [],
  },
  {
    name: `darwin`,
    alias: [
      `macos`,
    ],
  },
  {
    name: `freebsd`,
    alias: [],
  },
  {
    name: `linux`,
    alias: [],
  },
  {
    name: `openbsd`,
    alias: [],
  },
  {
    name: `sunos`,
    alias: [],
  },
  {
    name: `win32`,
    alias: [
      `windows`
    ],
  },
].map(item => {
  return {
    ...item,
    alias: [...new Set([item.name, ...item.alias].map(alias => {
      let arr = []
      arr.push(alias)
      if(typeof(alias) === `string`) {
        arr.push(alias.replace(/-/g, `_`))
        arr.push(alias.replace(/_/g, `-`))
      }
      return arr
    }).flat())],
  }
})

/**
 * The alias corresponding to os.arch
 */
const archList = [
  {
    name: `arm`,
    alias: [
      `armbe`,
    ],
  },
  {
    name: `arm64`,
    alias: [
      `arm64be`,
      `arm_64be`,
    ],
  },
  {
    name: `x32`,
    alias: [
      `x86`,
      `x86-32`,
      `ia32`,
      `ia-32`,
      /^i\d86$/i, // i386 i586 i686...
    ],
  },
  {
    /**
     * In fact, x64 is not backward compatible with x32, but some people will name x32 compatible programs x64
     */
    name: `x64`,
    alias: [
      `x86_64`,
      `amd64`,
      `amd_64`,
      `intel64`,
      `intel_64`,
      `em64t`,
      `em_64t`,
      `amd64p32`,
      `amd_64p_32`,
      `ia_32e`,
    ],
  },
  {
    name: `mips`,
    alias: [],
  },
  {
    name: `mipsle`,
    alias: [],
  },
  {
    name: `s390`,
    alias: [],
  },
  {
    name: `s390x`,
    alias: [],
  },
  {
    name: `ppc`,
    alias: [
      `powerpc`,
    ],
  },
  {
    name: `ppc64`,
    alias: [
      `ppc64le`,
      `ppc_64le`,
      `powerpc64`,
      `powerpc_64`,
      `powerpc64le`,
      `powerpc_64le`,
    ],
  },
].map(item => {
  return {
    ...item,
    alias: [...new Set([item.name, ...item.alias].map(alias => {
      let arr = []
      arr.push(alias)
      if(typeof(alias) === `string`) {
        arr.push(alias.replace(/-/g, `_`))
        arr.push(alias.replace(/_/g, `-`))
      }
      return arr
    }).flat())],
  }
})


class Github {
  owner = ``
  repo = ``
  constructor({owner, repo}) {
    this.owner = owner
    this.repo = repo
  }
  /**
   * Get the version according to tag
   */
  async byTag (tag) {
    const httpData = await http.get(`https://api.github.com/repos/${this.owner}/${this.repo}/releases/tags/${tag}`).catch((err) => console.log(String(err)))
    const assets = httpData.assets.map(item => ({
      name: item.name,
      size: item.size,
      browser_download_url: item.browser_download_url,
      content_type: item.content_type,
    }))
    return assets
  }
  /**
   * Get the version name to find the version, if the name is empty, return the latest version
   */
  async byName (name) {
    const httpData = await http.get(`https://api.github.com/repos/${this.owner}/${this.repo}/releases?per_page=1&page=1`).catch((err) => console.log(String(err)))
    const assets = (name ? httpData.find(item => item.name === `name`) : httpData[0]).assets.map(item => ({
      name: item.name,
      size: item.size,
      browser_download_url: item.browser_download_url,
      content_type: item.content_type,
    }))
    return assets
  }
}

/**
 * Sort the files most likely to belong to the current environment first
 */
async function getEnvSortList({fileList, arch, platform}) {
  const archObj = archList.find(item => item.name === arch)
  const platformObj = platformList.find(item => item.name === platform)
  let listMatch = fileList.filter(file => {
    return platformObj.alias.some(alias => {
      if(typeof(alias) === `string`) {
        return file.name.toLowerCase().includes(alias.toLowerCase())
      } else {
        return file.name.match(alias)
      }
    })
  })
  .sort((a, b) => {
    const name = a.name
    return (
      name.endsWith(`.tar`)
      || name.endsWith(`.tar.gz`)
      || name.endsWith(`.tar.xz`)
      || name.endsWith(`.tgz`)
      || name.endsWith(`.zip`)
      || name.endsWith(`.7z`)
      || name.endsWith(`.rar`)
    ) ? -1 : 1
  })
  listMatch = listMatch.filter(file => {
    return archObj.alias.some(alias => {
      if(typeof(alias) === `string`) {
        return file.name.toLowerCase().includes(alias.toLowerCase())
      } else {
        return file.name.match(alias)
      }
    })
  })
  return listMatch
}

/**
 * https://stackoverflow.com/a/61269447
 * @param {*} fileUrl 
 * @param {*} outputLocationPath 
 * @returns 
 */
async function downloadFile(fileUrl, outputLocationPath) {
  const writer = fs.createWriteStream(outputLocationPath);

  return http({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  }).then(res => {

    //ensure that the user can call `then()` only when the file has
    //been downloaded entirely.

    return new Promise((resolve, reject) => {
      res.pipe(writer);
      let error = null;
      writer.on('error', err => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on('close', () => {
        if (!error) {
          resolve(true);
        }
        //no need to call the reject here, as it will have been called in the
        //'error' stream;
      });
    });
  });
}

/**
 * Get the name of the main program
 */
function getBinFile({dir, name}) {
  if(process.platform === `win32`) {
    return (process.env.PATHEXT || '').split(';').map(ext => {
      return `${dir}/${name}${ext}`
    } ).find(path => {
      return fs.existsSync(path)
    })
  } else {
    let binPath = `${dir}/${name}`
    return fs.existsSync(binPath) ? binPath : undefined
  }
}

function noCacheRequire(filePath) {
  delete require.cache[require.resolve(filePath)]
  return require(filePath)
}

function j2s(json) {
  return JSON.stringify(json, null, 2)
}

module.exports = {
  platformList,
  archList,
  j2s,
  noCacheRequire,
  Github,
  getBinFile,
  downloadFile,
  getEnvSortList,
}