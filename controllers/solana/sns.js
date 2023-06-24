const UserAgent = require('user-agents');
const { chromium } = require("playwright-chromium");
const Domains = require("../../models/domains");

const userAgent = new UserAgent();

const getAllSns = async (req, res) => {
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
      page.setDefaultTimeout(30000);
      await page.setViewportSize({ width: 1200, height: 800 })
      // page.on('request', (request) => console.log('>>', request.method(), request.url()))
      // page.on('response', async (response) => { console.log('<<', response.status(), response.url())})
      console.log("WAITING FOR THE RESPONSE");
      const responsePromise = page.waitForResponse(response => response.url() === `https://api.solscan.io/domain?address=${address}&cluster=` && response.status() === 200, {timeout: 30000});
      await page.goto(`https://solscan.io/account/${address}`);
      const responseRaw = await responsePromise;
      const responseData = await responseRaw.json();
      await browser.close();
 
      parsedArray = parseArray(responseData.data);
      res.status(200).json({"data": parsedArray, "success": true});
      newUserData = {...newUserData, domains: parsedArray};
      // writing data to DB for next time
      try {
          const user = await Domains.create(newUserData);
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

function parseArray(array) {
  return array.map(obj => {
      return { name: obj.name };
  });
}

module.exports = {getAllSns};