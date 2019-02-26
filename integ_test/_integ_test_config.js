/*
 * Configuration file for running integ tests; not an actual test.
 */

let config = {
  // Account with which deploy and send Txs (needs to have Aions for tests to work)
  TEST_ACCT_ADDR: '0xa0450c4333e72ed26552d7462c0b3669924eec816a219b3960d5b3f0b33f7444',       
  // Sender account password
  TEST_ACCT_PW: 'password', 
  // Sender account private key (hex with leading 0x)
  TEST_ACCT_PRIVKEY: '0xc0a97b1d6d68f3aed19e1d460287efcfd9e93cd294dd86963e08ab24622e4fc6b7dfe3a9fd46fbd034687a6c2a3ddfd61896b8e7521402369383d6a52a591a5b', 

  // Account with which to receive Txs (No aion will be consumed for tests)
  OTHER_TEST_ACCT_ADDR: '0xa0b88269779d225510ca880ed742e445db0c70efb1ee3159b6d56479ae3501f9',

  // Populate with max gas for transactions (recommended: 4000000)
  GAS: 4000000,                   
  // Populate with gas price (recommended: 10000000000)
  GAS_PRICE: 10000000000,             
}
module.exports = function() { 
    return config;
}();
