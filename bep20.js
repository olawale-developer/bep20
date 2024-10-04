const Web3 = require('web3');
const axios = require('axios');


//  const provider = new Web3.providers.WebsocketProvider('wss://bsc-mainnet.infura.io/ws/v3/af7468d0f18b4e4e922976ab88098c80');
// // Your Infura project URL or any other provider (like Alchemy)
// const web3 = new Web3(provider);

const dotenv = require('dotenv');
dotenv.config();



function createWebSocketProvider() {
  const provider = new Web3.providers.WebsocketProvider(process.env.BNB_API);

  provider.on('connect', () => {
    console.log('WebSocket connected');
  });

  provider.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  return provider;
}

let web3;

let tokenContract;
let provider
// // The wallet address you want to monitor
// const walletAddress = '0x75eF2EF415184b8Da30B61A6245B39409F45Aa50';


// The ERC-20 contract address (e.g., USDT, DAI)
 const tokenContractAddress = '0x55d398326f99059fF775485246999027B3197955';



const tokenAbi = [
  // Transfer event ABI
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "from", "type": "address" },
      { "indexed": true, "name": "to", "type": "address" },
      { "indexed": false, "name": "value", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  }
];

// Initialize the contract
function connectWebSocket() {
  if (provider) {
    provider.disconnect(); // Close existing connection before reconnecting
  }

  web3 = new Web3(createWebSocketProvider());

  tokenContract = new web3.eth.Contract(tokenAbi, tokenContractAddress);
  console.log('WebSocket connection initiated.');
}

function checkTransactionsBep20(wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, crypto_sent, receiver_amount, current_rate) {
    // Subscribe to new blocks
timers[transac_id]['subscription'] = web3.eth.subscribe('newBlockHeaders', (error, blockHeader) => {
        if (error) {
            console.error('Error subscribing to new blocks:', error);
            return;
        }
        console.log(`New block received. Block # ${blockHeader.number} for wallet ${wallet_address}, ${transac_id}`);
        console.log('---------------------------------------------------------------------------------------------------------------');
        // Subscribe to Transfer events from the contract
        tokenContract.getPastEvents('Transfer', {
            fromBlock: blockHeader.number,
            toBlock: 'latest'
        }, (error, events) => {
            if (error) {
                console.error('Error fetching events:', error);
                return;
            }
            // Process each transfer event
                events.forEach((event) => {
                const { from, to, value } = event.returnValues;
                 
                // Check if the transfer is to the monitored wallet address
                if (to.toLowerCase() === wallet_address.toLowerCase()) {
                    const amount = web3.utils.fromWei(value, 'ether')
            
                    const actualAmount = Number(amount).toFixed(8)
                    const expectedamount = crypto_sent.replace(/[^0-9.]/g, "");

                    if (actualAmount == expectedamount) { 
                            const amount = receiver_amount.replace(/[^0-9.]/g, "");
                            // Step 2: Remove everything after the dot, including the dot itself
                            const amount_sent = amount.split(".")[0];
                          console.log(`Tokens received: 
                           From: ${from}, 
                           To: ${to}, 
                           Amount: ${web3.utils.fromWei(value, 'ether')} tokens`);
                          clearTimeout(timers[transac_id]['Timeout']);
                          mongoroApi(acct_number, bank_name, bank_code, receiver_name, db, transac_id, amount_sent)
                          subscription(timers, transac_id)
                         actualAmounts(transac_id, actualAmount, amount_sent, db);
                         // set wallet_address to true in the db
                          setBep20WalletFlag(wallet_address,db)
                        return;
                    } else {
                  handleSmallAmount(actualAmount, expectedamount, current_rate, transac_id, acct_number, bank_name, bank_code, receiver_name, db,wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, current_rate);
          }
                }
            });
        });
    }).on('error', console.error);
}


function handleSmallAmount(actualAmount, expectedamount, current_rate, transac_id, acct_number, bank_name, bank_code, receiver_name, db,wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, current_rate) {
  const rate = current_rate.replace(/[^0-9.]/g, "");
  const naira = actualAmount * rate;
  let transactionFee;
   console.log('this function is working perfectly')
  if (naira <= 100000) {
    transactionFee = 500;
  } else if (naira <= 1000000) {
    transactionFee = 1000;
  } else if (naira <= 2000000) {
    transactionFee = 1500;
  }

  const num = 50
  const fifty = Number(num).toFixed(8)
  
  const nairaValue = naira - transactionFee;
  if (nairaValue > transactionFee) {
    if (actualAmount <= fifty) {
      const max = Number(actualAmount) + 5
      const maxAmount = max.toFixed(8)
      const min = Number(actualAmount) - 5
      const minAmount = min.toFixed(8)
      console.log('maxAmount:',maxAmount)
      console.log("minAmount:", minAmount)
      console.log("actualAmount:", actualAmount)
      console.log("expectedamount:", expectedamount)
      if (expectedamount <= maxAmount && expectedamount >= minAmount) {
        console.log('for smaller money ')
           handleAmountCal(wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, actualAmount,nairaValue)
      }else {
            console.log('This amount is too less for the transaction.');
       }

    } else if (actualAmount > fifty) {
      const max = Number(actualAmount) * 1.1
      const maxAmount = max.toFixed(8) 
      const min = Number(actualAmount) * 0.9
      const minAmount = min.toFixed(8)

      if (expectedamount <= maxAmount && expectedamount >= minAmount) {
         console.log('for bigger money ')
       handleAmountCal(wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, actualAmount,nairaValue)
      } else {
            console.log('This amount is too big for the transaction.');
       }
  }
  } else {
    console.log('This amount is too small for the transaction.');
  }
}


function handleAmountCal(wallet_address, acct_number, bank_name, bank_code, receiver_name, db, transac_id, timers, actualAmount,nairaValue) {
  
    const strNairaValue = nairaValue.toString();
    const amount = strNairaValue.replace(/[^0-9.]/g, "");
    const amt_sent = amount.split(".")[0];
    const amount_sent = `₦${amt_sent.toLocaleString()}`;

    clearTimeout(timers[transac_id]['Timeout']);
    mongoroApi(acct_number, bank_name, bank_code, receiver_name, db, transac_id, amt_sent);
    subscription(timers, transac_id);
    actualAmounts(transac_id, actualAmount, amount_sent, db);
    setBep20WalletFlag(wallet_address, db);

}



function actualAmounts(transac_id, actualAmount,amount_sent,db) {
  const user = {
    actual_crypto: actualAmount,
    Settle_amount_sent: amount_sent
   };
     db.query(`UPDATE 2settle_transaction_table SET ? WHERE transac_id = ?`, [user, transac_id]);
}


function setBep20WalletFlag(wallet_address,db) {
     const user = { bep20_flag: 'true' };
     db.query(`UPDATE 2Settle_walletAddress SET ? WHERE eth_bnb_wallet = ?`, [user, wallet_address]);
}

function subscription(timers, transac_id) {
    timers[transac_id]['subscription'].unsubscribe((error, success) => {
            if (success) {
                console.log('Successfully unsubscribed.');
            } else {
                console.error('Error unsubscribing:', error);
            }
        });
}

async function mongoroApi(acct_number, bank_name, bank_code, receiver_name,db,transac_id,amount_sent) {
    console.log(receiver_name)
    const user = {
        accountNumber: acct_number,
        accountBank: bank_code,
        bankName: bank_name,
        amount: amount_sent,
        saveBeneficiary: false,
        accountName: receiver_name,
        narration: "Sirftiech payment",
        currency: "NGN",
        callbackUrl: "http://localhost:3000/payment/success",
        debitCurrency: "NGN",
        pin: "111111"
    };
    
    try {
        const response = await fetch('https://api-biz-dev.mongoro.com/api/v1/openapi/transfer', {
            method: 'POST', // HTTP method
            headers: {
                'Content-Type': 'application/json',    // Content type
                'accessKey': '117da1d3e93c89c3ca3fbd3885e5a6e29b49001a',
                'token': '75bba1c960a6ce7b608e001d9e167c44a9713e40'
            },
            body: JSON.stringify(user) // Data to be sent
        });

        const responseData = await response.json();

        if (!response.ok) {
            
         const messageDetails = [
          `Name: ${receiver_name}`,
          `Bank name: ${bank_name}`,
          `Account number: ${acct_number}`,
          `Receiver Amount: ${amount_sent}`,
        ];

        const menuOptions = [
          [{ text: 'Successful', callback_data: `Transaction_id: ${transac_id} Successful` }]
        ];

            const message = `${messageDetails.join('\n')}}`
             await axios.post('http://50-6-175-42.bluehost.com:5000/message', {
                message: message,
                menuOptions: menuOptions,
             })
            
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);

        }
        if (responseData) {
            console.log('working baby')
             const user = { status: 'Successful' };
         db.query(`UPDATE 2settle_transaction_table SET ? WHERE transac_id = ?`, [user, transac_id]);
        }
        console.log('Transaction successful:', responseData);
    } catch (error) {
        console.error('Error:', error);



    }
}

module.exports = {
    checkTransactionsBep20,
    setBep20WalletFlag,
    subscription,
    connectWebSocket
}