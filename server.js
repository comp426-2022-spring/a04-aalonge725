// Require minimist module
const args = require('minimist')(process.argv.slice(2))
// See what is stored in the object produced by minimist
console.log(args)
// Store help text 
const help = (`
server.js [options]

--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help	Return this message and exit.
`)
// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

const express = require('express')
const app = express()
const coin = require('./coin.js')

args["port"]
args["debug"]
const port = args.port || process.env.PORT || 3000
const server = app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%', port))
});

const db = require('./database.js')

const morgan = require('morgan')
const fs = require('fs')

if (args.debug == "true" || args.debug == true) {
    app.get("/app/log/access", (req, res) => {
        try {
            const stmt = db.prepare('SELECT * FROM accesslog').all()
            res.status(200).json(stmt)
        } catch (err) {
            console.error(err)
        }
    })
}

if (args.log == "true" || args.log == true) {
    const logStream = fs.createWriteStream('access.log', {flags: 'a'})
    app.use(morgan('combined', {stream:logStream}))
}

app.use((req, res, next) => {
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referer: req.headers['referer'],
        useragent: req.headers['user-agent']
    }

    const stmt = db.prepare(`INSERT INTO accesslogs (remoteaddr, remoteuser, time, method, url, protocol, httpversion, secure, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`)
    const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referer, logdata.useragent)
    next()
})

app.get('/app/flip/', (req, res) => {
    var flip = coin.coinFlip()
    res.status(200).json({'flip': flip})
})

app.get('/app/flips/:number', (req, res) => {
    var flipResult = coin.coinFlips(req.params.number)
    var summary = countFlips(flipResult)
    res.status(200).json({'raw': flipResult, 'summary': summary})
})

app.get('/app/flip/call/heads', (req, res) => {
    res.status(200).json(coin.flipACoin('heads'))
})