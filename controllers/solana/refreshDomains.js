const UserAgent = require('user-agents');
const { chromium } = require("playwright-chromium");
const Domains = require("../../models/domains");

const userAgent = new UserAgent();

const getAllNewDomains = async (req, res) => {
    const { address } = req.query;
    const options = {
        userAgent: userAgent.toString()
    }

    var userExists = false;
    var userIdFound;
    var domainsFound = [];
    var dateAdded = Date("<YYYY-mm-ddTHH:MM:ssZ>");
    var dateUpdated = Date("<YYYY-mm-ddTHH:MM:ssZ>");

    const walletData = {wallet: address};
    let parsedArray = [];

    let userData = {
        wallet: address,
        domains: [],
        updatedOn: dateUpdated
    };   

    let newUserData = {
        wallet: address,
        domains: [],
        comments: '',
        createdOn: dateAdded,
        updatedOn: dateUpdated
    };  

    try {
        console.log("STARTING SNS WORKER");
        // get domains array from DB
        try {
            const users = await Domains.find(walletData);

            if (users.length == 0) {
                console.log("NO User ID found by this Wallet Address");
                userExists = false;
            }
            else {
                console.log("Existing User ID: " + users[0]._id);
                userExists = true;
                userIdFound = users[0]._id;
                domainsFound = users[0].domains;
            }
        } catch (error) {
            console.log("The request to find the User ID in the database failed altogether, please refresh");
            console.log(error);
        }
        //get domains array from Worker
        try {
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
            });

            const secondSelectorPromise = page.waitForSelector('button:has-text("Browse domains")')
            .then( async () => {
            console.log('NO Domain found');
            });

            await Promise.race([firstSelectorPromise, secondSelectorPromise]);
            
            await browser.close();
        } catch (error) {
            console.log(error);
        }
        // compare domains arrays and see if update is needed        
        if (userExists) {
            const isArraysEqual = areArraysEqual(domainsFound, parsedArray);
            if (isArraysEqual) {
                console.log("DB is up to date");
                res.status(200).json({"data": domainsFound, "success": true});
            } else {
                console.log("DB is outdated, updating domains");
                res.status(200).json({"data": parsedArray, "success": true});
                // update DB with new values
                userData = {...userData, domains: parsedArray, updatedOn: dateUpdated};
                try {
                    const user = await Domains.findByIdAndUpdate(userIdFound, userData, {
                        new: true,
                        runValidators: true
                    });
                } catch (error) {
                    console.log(error);
                }
            }
        } else {
            res.status(200).json({"data": parsedArray, "success": true});
            // create new user in DB
            newUserData = {...newUserData, domains: parsedArray};
            try {
                const user = await Domains.create(newUserData);
                console.log("NEW User ID created: " + user._id)
            } catch (error) {
                console.log("The request to create the User in the DB failed altogether, please try again");
                console.log(error);
            }
        }

        console.log("STOPPING SNS WORKER");
    } catch (err) {
        const out = {
        error: "Something went wrong...",
        message: err.message,
        };
        res.status(500).json(out);
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

function areArraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }
  
    const sortedArr1 = arr1.sort((a, b) => (a.name > b.name ? 1 : -1));
    const sortedArr2 = arr2.sort((a, b) => (a.name > b.name ? 1 : -1));
  
    for (let i = 0; i < sortedArr1.length; i++) {
      const obj1 = sortedArr1[i];
      const obj2 = sortedArr2[i];
  
      const str1 = JSON.stringify(obj1);
      const str2 = JSON.stringify(obj2);
  
      if (str1 !== str2) {
        return false;
      }
    }
  
    return true;
}

module.exports = {getAllNewDomains};