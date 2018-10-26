var SafeMath = artifacts.require('./SafeMath.sol');
var DirectCryptToken = artifacts.require("./DirectCryptToken.sol");
var DirectCryptTokenICO = artifacts.require("./DirectCryptTokenICO.sol");
var EthPriceProvider = artifacts.require("./EthPriceProvider.sol");
var InvestorWhiteList = artifacts.require("./InvestorWhiteList.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, DirectCryptToken);
  deployer.link(SafeMath, DirectCryptTokenICO);
  deployer.deploy(DirectCryptToken).then(async function() {
    const hardCap = 133000; //in ETH
    const softCap = 12500; //in ETH
    const token = DirectCryptToken.address;
    const beneficiary = web3.eth.accounts[0];
    const startTime = (await web3.eth.getBlock(await web3.eth.blockNumber)).timestamp;
    const endOfFirstDecade = startTime + 3600 * 24 * 10;
    const endOfSecondDecade = startTime + 3600 * 24 * 20;
    const endOfThirdDecade = startTime + 3600 * 24 * 30;
    const endTime = web3.eth.blockNumber + 3600 * 24 * 40;
    await deployer.deploy(InvestorWhiteList);
    await deployer.deploy(
      DirectCryptTokenICO,
      hardCap,
      softCap,
      token,
      beneficiary,
      InvestorWhiteList.address,
      25500,
      420000,
      startTime,
      endOfFirstDecade,
      endOfSecondDecade,
      endOfThirdDecade,
      endTime
    );
    await deployer.deploy(EthPriceProvider);

    const icoInstance = web3.eth.contract(DirectCryptTokenICO.abi).at(DirectCryptTokenICO.address);
    const ethProvider = web3.eth.contract(EthPriceProvider.abi).at(EthPriceProvider.address);

    icoInstance.setEthPriceProvider(EthPriceProvider.address, { from: web3.eth.accounts[0] });
    ethProvider.setWatcher(DirectCryptTokenICO.address, { from: web3.eth.accounts[0] });

    //start update and send ETH to cover Oraclize fees
    ethProvider.startUpdate(30000, { value: web3.toWei(1000), from: web3.eth.accounts[0], gas: 200000 });
  });
};
