const core = require('@actions/core')
const process = require('process')
const spawn = require('child_process').spawnSync
const path = require('path')
const fs = require('fs')
const URL = require('url').URL
const { https } = require('follow-redirects')
const AdmZip = require('adm-zip')

const selectPlatforn = (platform) =>
    platform ? [null, platform] :
    process.platform === 'win32' ? [null, 'win'] :
    process.platform === 'darwin' ? [null, 'mac'] :
    process.platform === 'linux' ? [null, 'linux'] :
    [new Error(`Unsupported platform '${process.platform}'`), '']

try {
    const version = core.getInput('version', {required: true})
    const destDir = core.getInput('destination') || 'ninja-build'

    const [error, platform] = selectPlatforn(core.getInput('platform'));
    if (error) throw error

    const url = new URL(`https://github.com/ninja-build/ninja/releases/download/v${version}/ninja-${platform}.zip`)
    //const url = new URL('https://google.com')
    console.log(`downloading ${url}`)

    const request = https.get(url, {followAllRedirects: true}, result => {
        const data = []

        result.on('data', chunk => data.push(chunk))

        result.on('end', () => {
            const length = data.reduce((len, chunk) => len + chunk.length, 0)
            const buffer = Buffer.alloc(length)

            console.log(`received file, size ${buffer.length}`)

            data.reduce((pos, chunk) => {
                chunk.copy(buffer, pos)
                return pos + chunk.length
            }, 0)

            const zip = new AdmZip(buffer)
            const entry = zip.getEntries()[0]

            const fullDestDir = path.resolve(process.cwd(), destDir)
            if (!fs.existsSync(fullDestDir)) fs.mkdirSync(fullDestDir, {recursive: true})

            zip.extractEntryTo(entry.entryName, fullDestDir)

            const fullFileDir = path.join(fullDestDir, entry.entryName)
            if (!fs.existsSync(fullFileDir)) throw new Error(`failed to extract to '${fullFileDir}'`)

            fs.chmodSync(fullFileDir, '755')

            console.log(`extracted '${entry.entryName}' to '${fullFileDir}'`)

            const result = spawn(fullFileDir, ['--version'], {encoding: 'utf8'})
            if (result.error) throw error

            console.log('$ ninja --version')
            console.log(result.stdout)

            core.addPath(fullDestDir)
        })
    })
    request.on('error', error => { throw error })
} catch (error) {
    core.setFailed(error.message)
}
