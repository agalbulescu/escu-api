const UserAgent = require('user-agents');
const { chromium } = require("playwright-chromium");
const Domains = require("../../models/domains");

const userAgent = new UserAgent();

const getAllDomains = async (req, res) => {
    const { address } = req.query;
    const options = {
        userAgent: userAgent.toString()
    }

    var userExists = false;
    var dateAdded = Date("<YYYY-mm-ddTHH:MM:ssZ>");
    var dateUpdated = Date("<YYYY-mm-ddTHH:MM:ssZ>");

    const walletData = {wallet: address};
    let parsedArray = []; 

    let newUserData = {
        wallet: address,
        domains: [],
        comments: '',
        createdOn: dateAdded,
        updatedOn: dateUpdated
    };  

    // check if the wallet exists in DB
    try {
        const users = await Domains.find(walletData);

        // console.log(users);

        if (users.length == 0) {
            console.log("NO User ID found by this Wallet Address");
            userExists = false;
        }
        else {
            console.log("Existing User ID: " + users[0]._id);
            userExists = true;
            domainsFound = users[0].domains;
            res.status(200).json({"data": domainsFound, "success": true});
            }

    } catch (error) {
        console.log("The request to find the User ID in the database failed altogether, please refresh");
        console.log(error);

    }

    // if wallet is not found in DB
    if (!userExists) {

        try {
            console.log("STARTING SNS WORKER");
        
            const browser = await chromium.launch({
                headless: true,
                chromiumSandbox: false,
            });
            const page = await browser.newPage(options);
            await page.setViewportSize({ width: 1200, height: 800 })
            await page.goto(`https://naming.bonfida.org/profile?pubkey=${address}`);
        
            console.log("SEARCHING FOR DOMAINS");
        
            const firstSelectorPromise = page.waitForSelector('[data-test-id="virtuoso-item-list"]:visible')
            .then( async () => {
                console.log('Domains found');
        
                await page.waitForSelector('button[aria-label="switch row-card"]');
                await page.click('button[aria-label="switch row-card"]');
        
                const links = await page.$$eval('a.text-text-domain-card', (anchors) => {
                    return anchors.map((anchor) => anchor.href);
                });
                parsedArray = parseURLs(links);
                // console.log(parsedArray);
                newUserData = {...newUserData, domains: parsedArray};
                // console.log(userData);
            });
        
            const secondSelectorPromise = page.waitForSelector('button:has-text("Browse domains")')
            .then( async () => {
            console.log('NO Domain found');
            });
        
            await Promise.race([firstSelectorPromise, secondSelectorPromise]);
            
            await browser.close();
            
            res.status(200).json({"data": parsedArray, "success": true});

            // writing data to DB for next time
            try {
                const user = await Domains.create(newUserData);

                // console.log(user);
                console.log("NEW User ID created: " + user._id)

            } catch (error) {
                console.log("The request to create the User ID in the database failed altogether, please refresh");
                console.log(error);
            }
        
            console.log("STOPPING SNS WORKER");
        } catch (err) {
            const out = {
            error: "Something went wrong...",
            message: err.message,
            };
            res.status(500).json(out);
        }
    } 
};

function parseURLs(urls) {
    const parsedArray = [];
  
    for (const url of urls) {
      const splitArray = url.split('=');
      const name = splitArray[1] + '.sol';
      const parsedObject = { name };
      parsedArray.push(parsedObject);
    }
  
    return parsedArray;
}; 

module.exports = {getAllDomains};