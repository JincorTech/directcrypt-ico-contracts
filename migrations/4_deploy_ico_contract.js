var SafeMath = artifacts.require('./SafeMath.sol');
var MyPizzaPieToken = artifacts.require("./MyPizzaPieToken.sol");
var MyPizzaPieTokenICO = artifacts.require("./MyPizzaPieTokenICO.sol");
var EthPriceProvider = artifacts.require("./EthPriceProvider.sol");
var BtcPriceProvider = artifacts.require("./BtcPriceProvider.sol");
var InvestorWhiteList = artifacts.require("./InvestorWhiteList.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, MyPizzaPieToken);
  deployer.link(SafeMath, MyPizzaPieTokenICO);
  deployer.deploy(MyPizzaPieToken).then(async function() {
    const hardCap = 26600000; //in PZA
    const softCap = 2500000; //in PZA
    const token = MyPizzaPieToken.address;
    const beneficiary = web3.eth.accounts[0];
    const startBlock = web3.eth.blockNumber;
    const endOfFirstDecade = startBlock + 500;
    const endOfSecondDecade = startBlock + 1000;
    const endOfThirdDecade = startBlock + 1500;
    const endBlock = web3.eth.blockNumber + 2000;
    await deployer.deploy(InvestorWhiteList);
    await deployer.deploy(
      MyPizzaPieTokenICO,
      hardCap,
      softCap,
      token,
      beneficiary,
      InvestorWhiteList.address,
      25500,
      420000,
      startBlock,
      endOfFirstDecade,
      endOfSecondDecade,
      endOfThirdDecade,
      endBlock
    );
    await deployer.deploy(EthPriceProvider);
    await deployer.deploy(BtcPriceProvider);

    const icoInstance = web3.eth.contract(MyPizzaPieTokenICO.abi).at(MyPizzaPieTokenICO.address);
    const ethProvider = web3.eth.contract(EthPriceProvider.abi).at(EthPriceProvider.address);
    const btcProvider = web3.eth.contract(BtcPriceProvider.abi).at(BtcPriceProvider.address);

    icoInstance.setEthPriceProvider(EthPriceProvider.address, { from: web3.eth.accounts[0] });
    icoInstance.setBtcPriceProvider(BtcPriceProvider.address, { from: web3.eth.accounts[0] });
    ethProvider.setWatcher(MyPizzaPieTokenICO.address, { from: web3.eth.accounts[0] });
    btcProvider.setWatcher(MyPizzaPieTokenICO.address, { from: web3.eth.accounts[0] });

    //start update and send ETH to cover Oraclize fees
    ethProvider.startUpdate(30000, { value: web3.toWei(1000), from: web3.eth.accounts[0], gas: 200000 });
    btcProvider.startUpdate(650000, { value: web3.toWei(1000), from: web3.eth.accounts[0], gas: 200000 });
  });
};
