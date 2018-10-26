var SafeMath = artifacts.require('./SafeMath.sol');
var DirectCryptToken = artifacts.require("./DirectCryptToken.sol");
var DirectCryptTokenPreSale = artifacts.require("./DirectCryptTokenPreSale.sol");
var EthPriceProvider = artifacts.require("./EthPriceProvider.sol");
var BtcPriceProvider = artifacts.require("./BtcPriceProvider.sol");
var InvestorWhiteList = artifacts.require("./InvestorWhiteList.sol");

module.exports = async function(deployer) {
  await deployer.deploy(SafeMath);
  deployer.link(SafeMath, DirectCryptToken);
  deployer.link(SafeMath, DirectCryptTokenPreSale);
  await deployer.deploy(DirectCryptToken).then(async function() {
    const hardCap = 2000000000; //in cents
    const softCap = 200000000; //in cents
    const token = DirectCryptToken.address;
    const totalTokens = 8700000; //NOT in wei, converted by contract
    const beneficiary = web3.eth.accounts[0];
    const baseEthUsdPrice = 50000; //in cents
    const baseBtcUsdPrice = 800000; //in cents
    const ethPriceProvider = web3.eth.accounts[8];
    const btcPriceProvider = web3.eth.accounts[7];
    const tokenMinimalPurchase = 10000;
    const tokenPriceUsd = 100; //in cents
    const startTime = Date.now() / 1000;
    const endTime = startTime + 3600 * 24 * 5;
    await deployer.deploy(InvestorWhiteList);
    await deployer.deploy(DirectCryptTokenPreSale,
      hardCap,
      softCap,
      token,
      beneficiary,
      InvestorWhiteList.address,

      totalTokens,
      tokenPriceUsd,

      baseEthUsdPrice,
      baseBtcUsdPrice,

      startTime,
      endTime
    );
    await deployer.deploy(EthPriceProvider);
    await deployer.deploy(BtcPriceProvider);

    const preSaleInstance = await web3.eth.contract(DirectCryptTokenPreSale.abi).at(DirectCryptTokenPreSale.address);
    const ethProvider = await web3.eth.contract(EthPriceProvider.abi).at(EthPriceProvider.address);
    const btcProvider = await web3.eth.contract(BtcPriceProvider.abi).at(BtcPriceProvider.address);

    await preSaleInstance.setEthPriceProvider(EthPriceProvider.address, { from: web3.eth.accounts[0] });
    await preSaleInstance.setBtcPriceProvider(BtcPriceProvider.address, { from: web3.eth.accounts[0] });
    await ethProvider.setWatcher(DirectCryptTokenPreSale.address, { from: web3.eth.accounts[0] });
    await btcProvider.setWatcher(DirectCryptTokenPreSale.address, { from: web3.eth.accounts[0] });

    //start update and send ETH to cover Oraclize fees
    await ethProvider.startUpdate(30000, { value: web3.toWei(1000), from: web3.eth.accounts[0], gas: 200000 });
    await btcProvider.startUpdate(650000, { value: web3.toWei(1000), from: web3.eth.accounts[0], gas: 200000 });
  });
};
