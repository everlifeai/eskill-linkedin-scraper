const puppeteer = require('puppeteer')
var os = require("os")
const fs = require('fs')


/**
 *      /outcome
 * linkedIn 
 * @param {*} userID 
 * @param {*} pwd 
 * @param {*} linkedinUrl 
 */

async function linkedinScraper(userID,pwd,linkedinUrl){
    let browser = await getBrowser()	
    let page = await browser.newPage()
    let data = {}
    
    try{
        
        
        await page.setViewport({width: 1920, height: 1080})
        await page.goto('https://www.linkedin.com/uas/login?trk=guest_homepage-basic_nav-header-signin',{timeout :75000})
       
        //For fetching username
        const user_name = "input#username"
        await page.waitForSelector(user_name,{timeout:300000})
        await page.type(user_name,userID)

        //For fetching password
        const pass_word = "input#password"
        await page.waitForSelector(pass_word,{timeout:300000})
        await page.type(pass_word,pwd)

        //To click login button
        const submitButton = "button.btn__primary--large"
        await page.waitForSelector(submitButton)
        await page.click(submitButton)
        await page.waitFor('input[role=combobox]', {timeout: 750000})
                
        await page.goto(linkedinUrl,{timeout :750000})
        
        await page.waitFor('input[role=combobox]', {timeout: 750000})

        await autoScroll(page)
        // Fetching profile details
        let profile = await page.evaluate(() => {
            const profileData = {}

            // Fetching Name
            const data1 = document.querySelectorAll('li.inline.t-24.t-black.t-normal.break-words')
            profileData.name = data1[0].innerText

            // Fetching Location
            const data2 = document.querySelectorAll('li.t-16.t-black.t-normal.inline-block')
            var loc1 = data2[0].innerText
            if(loc1.includes(",")){
               loc1 = loc1.replace(/,/g," ")
            }
            profileData.location = loc1

            // Fetching Company Name
            const data3 = document.querySelectorAll("span.text-align-left.ml2.t-14.t-black.t-bold.full-width.lt-line-clamp.lt-line-clamp--multi-line.ember-view")
            profileData.company = data3[0].innerText

            // Fetching Title
            const temp2 = document.querySelectorAll('.pv-profile-section__card-item-v2.pv-profile-section.pv-position-entity.ember-view')
            const temp5=document.querySelectorAll('ul.pv-entity__position-group.mt2') 
            if(temp2.length > 0){
                const temp3 = temp2[0].innerText
                var lsplit = temp3.split('\n')
                profileData.title = lsplit[0]
            }
            if ( temp5.length>0) {
                const temp1 = temp5[0].innerText
                if(temp1.startsWith('Title')){
                    var k = temp1.split('\n')
                    profileData.title = k[1]
                } else if(!profileData.title){ 
                    var ksplit = temp1.split('\n')
                    profileData.title = ksplit[0]
                }
            }

            // Fetching company URL
           
            var g = document.querySelector("a[data-control-name='background_details_company']").href
            profileData.company_url =  g
            // Fetching Company_Location
            var loc7 = document.querySelectorAll('h4.pv-entity__location.t-14.t-black--light.t-normal.block')
            if(loc7.length>0){
            var loc8 = loc7[0].innerText
            profileData.Company_location = loc8.replace('Location\n', '')
            }
         

            if(!profileData.Company_location)profileData.Company_location = 'NIL'
            if(!profileData.name)profileData.name = 'NIL'
            if(!profileData.title)profileData.title = 'NIL'
            if(!profileData.company)profileData.company = 'NIL'
            if(!profileData.domain)profileData.domain = 'NIL'
            if(!profileData.location)profileData.Location = 'NIL'
            if(!profileData.Company_location)profileData.Company_location = 'NIL'
            
            return (profileData)
        })
        profile.url = await page.url()  
        
        
        let companydomain = await page.goto(profile.company_url+'about/',{timeout:175000})    
        .then(async()=>{
            await autoScroll(page);
            let company =await page.waitFor("input[role=combobox]",{timeout:75000})
            .then(async()=>{
                const data11= await page.$$("dl")
                const data12 = await (await data11[0].getProperty('innerText')).jsonValue()
                const data13 = data12.split('\n')
                let companydetails={}
                var site = data13[1]
                if(site.includes('www')&& site.includes('http')){
                    var websplit = site.split('www.')
                    websplit[1] = websplit[1].replace('/','')
                }else if(site.includes('http')&& !site.includes('www')){
                    var websplit =site.split('://')
                    websplit[1] = websplit[1].replace('/','')
                }
                
                companydetails.website =websplit[1]
                
                

                return companydetails
                
            })
            
            return company
            
            
        }) 
        
        
        var firstname = profile['name'].split(' ')
        let profileDetails = {}
        let domain = companydomain.website


        profileDetails.name = profile.name
        profileDetails.firstname = firstname[0]
        profileDetails.lastname = firstname[1]
        profileDetails.domain =companydomain.website
        profileDetails.linkedin_id = profile.url
        profileDetails.title = profile.title
        profileDetails.company = profile.company
        profileDetails.location = profile.location
        profileDetails.company_location = profile.Company_location
       
        await browser.close()
        data['success'] = true
        data['profile']=profileDetails
        return data

        
        
            
       
    }catch(e){
        data['success'] = false
        await browser.close()
        console.log(e)
        throw new Error('Failed ....')

    }
    
    

}



//For scrolling down a page
async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    })
}    

// Basically function identifies OS type & Version and check whether OS is Windows 7 or not.   		
function windows7_check(){		
  		
    var os_type = os.type()  		
    var os_version = os.release()		
            
    // Convert variable os_version (from string to float) and takes first 3 digits for detecting OS.		
    let version_number= parseFloat(os_version.slice(0,3))		
            
    const os_data = {"Operating System": os_type , "Version" : version_number }		
             
  // Table of various windows operating systems : 		
  // https://docs.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-osversioninfoexw#remarks    		
  // From above table we can know Version number of Windows 7 is '6.1'. 		
  if (os_data.Version === 6.1)		
      return true		
  }
  function getLinkedinUrl(task){
    let variables = task.variables
    for(let i=0; i < variables.length; i++){
        if(variables[i].name==='lead_url'){
            return variables[i].value
        }
    }
}

function getData(task){
    let variables = task.variables
    for(let i=0; i < variables.length; i++){
        if(variables[i].name==='data'){
            return variables[i].value
        }
    }
  }
  
  async function getBrowser(){		
    // Often when running on Windows 7,headless mode ignores the default proxy which will lead to Navigation Timeout Errors.  		
    // So For Windows 7 we are explicity bypassing all proxies. And for other operating systems,we are using no sandbox environment.		
    // You can find the details of issue on the following link : https://github.com/GoogleChrome/puppeteer/issues/2613  		
    if (windows7_check())		
      return await puppeteer.launch({ headless: true, slowMo: 100, args: [ '--proxy-server="direct://"', '--proxy-bypass-list=*']})  		
    else		
      return await puppeteer.launch({ headless: true, slowMo: 100, args: ['--no-sandbox'] })		
  }
  
  module.exports = {
    linkedinScraper,
    getBrowser,
    getLinkedinUrl,
    getData
  }
