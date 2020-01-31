'use strict'
const cote = require('cote')
const util = require('./util')
const u = require('elife-utils')



/* microservice key (identity of the microservice) */
let msKey = 'eskill_linkedin_scraper'

/*      understand/
 * This is the main entry point where we start.
 *
 *      outcome/
 * Start our microservice.
 */
function main() {
    startMicroservice()
    registerWithCommMgr()
    loadCrediential()
}

const ssbClient = new cote.Requester({
    name: 'LinkedIn Scraper Job Skill -> SSB client ',
    key: 'everlife-ssb-svc',
})

const levelDBClient = new cote.Requester({
    name: 'LinkedIn Scraper Job Skill -> Level DB Client',
    key: 'everlife-db-svc',
})

let auth
const commonerr = 'LinkedIn Scraper Job will not work'
const errmsg = {
    LEVELERR: `Error retriving your linkedIn credentials! If you have not set them, please do so by clicking skill tab and eskill-linkedIn otherwise ${commonerr}`,
    DECRYPTERR: `Error decrypting your linkedIn credentials! ${commonerr}`,
    PARSEERR: `Error loading your linkedIn credentials! ${commonerr}`,
}

function loadCrediential(){
    levelDBClient.send({type:'get',  key: 'eskill-linkedin-scraper'},(err, data) => {
        if(err) {
            u.showErr(err)
            sendReply(errmsg.LEVELERR, { USELASTCHAN: true })
        } else {
            ssbClient.send({type: 'decrypt-text', text: data },(err, data) => {
                if(err) {
                    u.showErr(err)
                    sendReply(errmsg.DECRYPTERR, { USELASTCHAN: true })
                } else {
                    try {
                        auth = JSON.parse(data)
                    } catch (e) {
                        u.showErr(e)
                        sendReply(errmsg.PARSEERR, { USELASTCHAN: true })
                    }
                }
            })
        }
    })
}


const commMgrClient = new cote.Requester({
    name: 'LinkedIn Scraper Job Skill -> CommMgr',
    key: 'everlife-communication-svc',
})

function sendReply(msg, req) {
    req.type = 'reply'
    req.msg = String(msg)
    commMgrClient.send(req, (err) => {
        if(err){
            u.showErr('eskill_linkedin_scraper:')
            u.showErr(err)
        }
    })
}

function startMicroservice() {

    /*      understand/
     * The microservice (partitioned by key to prevent
     * conflicting with other services).
     */
    const svc = new cote.Responder({
        name: 'LinkedIn Job',
        key: msKey,
    })
    svc.on('msg', (req, cb) => {
        if(!req.msg) return cb()
        
        else if(req.msg.startsWith('/linkedin_scraper')){ 
            cb(null, true)
            if(!auth || !auth.username || !auth.password){
                sendReply(errmsg.LEVELERR, req)
            }else {
            let lead_url = req.msg.substr('/linkedin_scraper'.length).trim()
            util.linkedinScraper(auth.username, auth.password, lead_url)
                    .then((result) => {
                        if(result && result.success)
                            sendReply(JSON.stringify(result.profile), req)
                        else 
                            sendReply('LinkedIn Scraper failed.', req)
                    })
                    .catch((err) => {
                        u.showErr(err)
                        sendReply('LinkedIn Scraper failed..', req)
                    })
            }
           
        }
        else{
            cb()
        }
    }) 
    svc.on('task', (req, cb) => { 
        
        try{
            
            let data = JSON.parse(util.getData(req.task)); 
            console.log(data)
            if(!auth || !auth.username || !auth.password) cb('LinkedIn credentials missing.')
            else {
                util.linkedinScraper(auth.username, auth.password, data.uri)
                    .then((result)=>{
                        if(result.success)
                            cb(null, req.task, result.profile)
                        else cb('something went wrong.')
                    })
                    .catch((err) => {
                        u.showErr(err)
                        cb('Something went wrong.')
                    })
                    
            }
         
        }catch(e){
            console.log(e)
            cb('Something went wrong')
        }
    })
}       
function registerWithCommMgr() {
    commMgrClient.send({
        type: 'register-msg-handler',
        mskey: msKey,
        mstype: 'msg',
        mshelp: [ 
            {cmd: '/linkedin_scraper', txt: 'To discover the lead ' },
          
        ],
    }, (err) => {
        if(err) u.showErr(err)
    })
}


main()


