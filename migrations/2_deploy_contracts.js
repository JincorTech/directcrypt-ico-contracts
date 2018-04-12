var SafeMath = artifacts.require('./SafeMath.sol');
var MyPizzaPieToken = artifacts.require("./MyPizzaPieToken.sol");
var MyPizzaPieTokenPreSale = artifacts.require("./MyPizzaPieTokenPreSale.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, MyPizzaPieToken);
  deployer.link(SafeMath, MyPizzaPieTokenPreSale);
  deployer.deploy(MyPizzaPieToken).then(function() {
    const hardCap = 350000; //in USD
    const softCap = 150000; //in USD
    const token = MyPizzaPieToken.address;
    const totalTokens = 81192000; //NOT in wei, converted by contract
    const limit = 50000; //in USD
    const beneficiary = web3.eth.accounts[0];
    const startBlock = web3.eth.blockNumber;
    const endBlock = web3.eth.blockNumber + 100;
    deployer.deploy(MyPizzaPieTokenPreSale, hardCap, softCap, token, beneficiary, totalTokens, 255, limit, startBlock, endBlock);
  });
};
