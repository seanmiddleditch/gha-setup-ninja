const core = require('@actions/core')
const process = require('process')
const spawn = require('child_process').spawnSync
const path = require('path')
const fs = require('fs')
const URL = require('url').URL
const { https } = require('follow-redirects')
const AdmZip = require('adm-zip')
const HttpsProxyAgent = require('https-proxy-agent')

function selectPlatform(platform, version) {
    if (platform) {
        return [null, platform]
    }
    
    let major, minor, patch = version.split('.').map((s) => parseInt(s))
    if (process.platform === 'win32') {
        if (process.arch === 'arm64') {
            if (major < 1 || major == 1 && minor < 12) {
                return [new Error(`Windows ARM builds are only available for 1.12.0 and later`), '']
            }
            else {
                return [null, 'winarm64']
            }
        }
        else if (process.arch === 'x64') {
            return [null, 'win']
        }
        else {
            return [new Error(`Unsupported architecture '${process.arch}'`), '']
        }
    }
    else if (process.platform === 'linux') {
        if (process.arch === 'arm64') {
            if (major < 1 || major == 1 && minor < 12) {
                return [new Error(`Linux ARM builds are only available for 1.12.0 and later`), '']
            }
            else {
                return [null, 'linux-aarch64']
            }
        }
        else if (process.arch === 'x64') {
            return [null, 'linux']
        }
        else {
            return [new Error(`Unsupported architecture '${process.arch}'`), '']
        }
    }
    else if (process.platform === 'darwin') {
        return [null, 'mac']
    }
    else {
        return [new Error(`Unsupported platform '${process.platform}'`), '']
    }
}

try {
    const version = core.getInput('version', {required: true})
    const destDir = core.getInput('destination') || 'ninja-build'
    const proxyServer = core.getInput('http_proxy')

    const [error, platform] = selectPlatform(core.getInput('platform'), version)
    if (error) throw error

    const url = new URL(`https://github.com/ninja-build/ninja/releases/download/v${version}/ninja-${platform}.zip`)

    if (proxyServer) {
        console.log(`using proxy ${proxyServer}`)
        url.agent = new HttpsProxyAgent(proxyServer)
    }

    console.log(`downloading ${url}`)
    const request = https.get(url, {followAllRedirects: true}, result => {
        const data = []

        result.on('data', chunk => data.push(chunk))

        result.on('end', () => {
            const length = data.reduce((len, chunk) => len + chunk.length, 0)
            const buffer = Buffer.alloc(length)

            data.reduce((pos, chunk) => {
                chunk.copy(buffer, pos)
                return pos + chunk.length
            }, 0)

            const zip = new AdmZip(buffer)
            const entry = zip.getEntries()[0]
            const ninjaName = entry.entryName

            const fullDestDir = path.resolve(process.cwd(), destDir)
            if (!fs.existsSync(fullDestDir)) fs.mkdirSync(fullDestDir, {recursive: true})

            zip.extractEntryTo(ninjaName, fullDestDir, /*maintainEntryPath*/false, /*overwrite*/true)

            const fullFileDir = path.join(fullDestDir, ninjaName)
            if (!fs.existsSync(fullFileDir)) throw new Error(`failed to extract to '${fullFileDir}'`)

            fs.chmodSync(fullFileDir, '755')

            console.log(`extracted '${ninjaName}' to '${fullFileDir}'`)

            core.addPath(fullDestDir)
            console.log(`added '${fullDestDir}' to PATH`)
            
            const result = spawn(ninjaName, ['--version'], {encoding: 'utf8'})
            if (result.error) throw error

            const installedVersion = result.stdout.trim()
            
            console.log(`$ ${ninjaName} --version`)
            console.log(installedVersion)

            if (installedVersion != version) {
                throw new Error('incorrect version detected (bad PATH configuration?)')
            }
        })
    })
    request.on('error', error => { throw error })
} catch (error) {
    core.setFailed(error.message)
}
