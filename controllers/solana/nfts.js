const axios = require("axios");
const { Connection } = require("@solana/web3.js");
const { getParsedNftAccountsByOwner } = require("@nfteyez/sol-rayz");
const Nfts = require("../../models/nfts")

const endpoint = process.env.CHAINSTACK_SOL;
const wsendpoint = process.env.CHAINSTACK_SOL_WS;
const config = {
    commitment: 'confirmed',
    wsEndpoint: wsendpoint
};
const connection = new Connection(endpoint, config);

const getAllNfts = async (req, res) => {
    const { address } = req.query;
    const walletData = {wallet: address};
    var nftArray;
    var metadatas;
    var userExists = false;
    var userIdFound;
    var nftsFound = [];
    var nftsMetadataFound = [];
    var dateAdded = Date("<YYYY-mm-ddTHH:MM:ssZ>");
    var dateUpdated = Date("<YYYY-mm-ddTHH:MM:ssZ>");

    let userData = {
        wallet: address,
        nfts: [],
        nftsMetadata: [],
        updatedOn: dateUpdated
    };  

    let newUserData = {
        wallet: address,
        nfts: [],
        nftsMetadata: [],
        comments: '',
        createdOn: dateAdded,
        updatedOn: dateUpdated
    };  
    
    try {
        console.log("STARTING SOL NFT WORKER");
        // get parsed NFT list from blockchain SDK
        try {
            nftArray = await fetchNftArray(address); 
            // console.log(nftArray);
        } catch (error) {
            console.log(error);
        }
        // look for user in DB
        try {
            const users = await Nfts.find(walletData);
            if (users.length == 0) {
                console.log("NO User found by this Wallet Address");
                userExists = false;
            }
            else {
                console.log("Existing User ID: " + users[0]._id);
                userExists = true;
                userIdFound = users[0]._id;
                nftsFound = users[0].nfts;
                // console.log(nftsFound);
                nftsMetadataFound = users[0].nftsMetadata;
            }
        } catch (error) {
            console.log("The request to find the User in the DB failed altogether, please try again");
            console.log(error);
        }

        if (userExists) {
            const isArraysEqual = areArraysEqual(nftsFound, nftArray);
            if (isArraysEqual) {
                console.log("DB is up to date");
                res.status(200).json({"data": nftsMetadataFound, "success": true});
            } else {
                console.log("DB is outdated, updating nfts and metadatas");
                metadatas = await fetchMetadata(nftArray);
                res.status(200).json({"data": metadatas, "success": true});
                // update DB with new values
                userData = {...userData, nfts: nftArray, nftsMetadata: metadatas, updatedOn: dateUpdated};
                try {
                    const user = await Nfts.findByIdAndUpdate(userIdFound, userData, {
                        new: true,
                        runValidators: true
                    });
                } catch (error) {
                    console.log(error);
                }
            }
        } else {
            metadatas = await fetchMetadata(nftArray);
            res.status(200).json({"data": metadatas, "success": true});
            // create user in DB
            userData = {...newUserData, nfts: nftArray, nftsMetadata: metadatas};
            try {
                const user = await Nfts.create(userData);
                console.log("NEW User ID created: " + user._id)
            } catch (error) {
                console.log("The request to create the User in the DB failed altogether, please try again");
                console.log(error);
            }
        }
        console.log("STOPPING SOL NFT WORKER");
    } catch (err) {
        const out = {
        error: "SOL NFT Worker: Something went wrong...",
        message: err.message,
        };
        res.status(500).json(out);
    }
};

const fetchMetadata = async (nftArray) => {
    let metadatas = [];
    for (const nft of nftArray) {
      try {
        await axios.get(nft.data.uri)
        .then( async (response) => await response.data)
        .then( (meta) => { 
          metadatas.push({...meta, ...nft});
        });
      } catch (error) {
        console.log(error);
      }
    }
    return metadatas;
};

const fetchNftArray = async (address) => {
    try {
        nftArray = await getParsedNftAccountsByOwner({
            publicAddress: address,
            connection: connection,
            serialization: true,
        });
        console.log("Found " + nftArray.length + " NFT's in this wallet");
    } catch (error) {
        console.log(error);
    }
    return nftArray;
}

function areArraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }
  
    const sortedArr1 = arr1.sort((a, b) => (a.mint > b.mint ? 1 : -1));
    const sortedArr2 = arr2.sort((a, b) => (a.mint > b.mint ? 1 : -1));
  
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

module.exports = {getAllNfts};