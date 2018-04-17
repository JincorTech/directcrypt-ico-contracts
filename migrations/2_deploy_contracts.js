var SafeMath = artifacts.require('./SafeMath.sol');
var MyPizzaPieToken = artifacts.require("./MyPizzaPieToken.sol");
var MyPizzaPieTokenPreSale = artifacts.require("./MyPizzaPieTokenPreSale.sol");
var EthPriceProvider = artifacts.require("./EthPriceProvider.sol");
var BtcPriceProvider = artifacts.require("./BtcPriceProvider.sol");
var InvestorWhiteList = artifacts.require("./InvestorWhiteList.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, MyPizzaPieToken);
  deployer.link(SafeMath, MyPizzaPieTokenPreSale);
  deployer.deploy(MyPizzaPieToken).then(async function() {
    const hardCap = 2000000000; //in cents
    const softCap = 200000000; //in cents
    const token = MyPizzaPieToken.address;
    const totalTokens = 8700000; //NOT in wei, converted by contract
    const beneficiary = web3.eth.accounts[0];
    const baseEthUsdPrice = 50000; //in cents
    const baseBtcUsdPrice = 800000; //in cents
    const ethPriceProvider = web3.eth.accounts[8];
    const btcPriceProvider = web3.eth.accounts[7];
    const tokenMinimalPurchase = 10000;
    const tokenPriceUsd = 100; //in cents
    const startBlock = web3.eth.blockNumber;
    const endBlock = web3.eth.blockNumber + 1000;
    await deployer.deploy(InvestorWhiteList);
    deployer.deploy(MyPizzaPieTokenPreSale, 
      hardCap,
      softCap,
      token,
      beneficiary,
      InvestorWhiteList.address,

      totalTokens,
      tokenMinimalPurchase,
      tokenPriceUsd,

      baseEthUsdPrice,
      baseBtcUsdPrice,

      startBlock,
      endBlock
    );
    await deployer.deploy(EthPriceProvider);
    await deployer.deploy(BtcPriceProvider);

    const preSaleInstance = web3.eth.contract(MyPizzaPieTokenPreSale.abi).at(MyPizzaPieTokenPreSale.address);
    const ethProvider = web3.eth.contract(EthPriceProvider.abi).at(EthPriceProvider.address);
    const btcProvider = web3.eth.contract(BtcPriceProvider.abi).at(BtcPriceProvider.address);

    preSaleInstance.setEthPriceProvider(EthPriceProvider.address, { from: web3.eth.accounts[0] });
    preSaleInstance.setBtcPriceProvider(BtcPriceProvider.address, { from: web3.eth.accounts[0] });
    ethProvider.setWatcher(MyPizzaPieTokenPreSale.address, { from: web3.eth.accounts[0] });
    btcProvider.setWatcher(MyPizzaPieTokenPreSale.address, { from: web3.eth.accounts[0] });

    //start update and send ETH to cover Oraclize fees
    ethProvider.startUpdate(30000, { value: web3.toWei(1000), from: web3.eth.accounts[0], gas: 200000 });
    btcProvider.startUpdate(650000, { value: web3.toWei(1000), from: web3.eth.accounts[0], gas: 200000 });
  });
};
