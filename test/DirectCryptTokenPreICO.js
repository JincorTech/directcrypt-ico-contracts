const DirectCryptToken = artifacts.require("DirectCryptToken");
const DirectCryptTokenPreICO = artifacts.require("DirectCryptTokenPreICO");
const InvestorWhiteList = artifacts.require("InvestorWhiteList");

const assertJump = function(error) {
  assert.isAbove(error.message.search('VM Exception while processing transaction: revert'), -1, 'Invalid opcode error must be returned');
};

const hardCap = 100; //in ETH
const softCap = 30; //in ETH
const beneficiary = web3.eth.accounts[0];
const baseEthUsdPrice = 50000; //in cents
const baseBtcUsdPrice = 100000; //in cents
const ethPriceProvider = web3.eth.accounts[8];
const btcPriceProvider = web3.eth.accounts[7];
const tokenPriceUsd = 100; //in cents
const totalTokens = 30000; //NOT in wei, converted by contract

async function increaseTimestampBy(seconds) {
  const jsonrpc = '2.0';
  const id = 0;
  const send = (method, params = []) => web3.currentProvider.send({id, jsonrpc, method, params});
  await send('evm_increaseTime', [seconds]);
  await send('evm_mine');
}

contract('DirectCryptTokenPreICO', function (accounts) {
  beforeEach(async function () {
    this.block = await web3.eth.getBlock(await web3.eth.blockNumber);
    this.startTime = this.block.timestamp;
    this.endTime = this.startTime + 3600*24;

    this.whiteList = await InvestorWhiteList.new();

    this.token = await DirectCryptToken.new();

    this.crowdsale = await DirectCryptTokenPreICO.new(
      hardCap,
      softCap,
      this.token.address,
      beneficiary,
      this.whiteList.address,

      totalTokens,
      tokenPriceUsd,

      baseEthUsdPrice,
      baseBtcUsdPrice,

      this.startTime,
      this.endTime
    );

    this.token.setTransferAgent(this.token.address, true);
    this.token.setTransferAgent(this.crowdsale.address, true);
    this.token.setTransferAgent(accounts[0], true);

    await this.crowdsale.setEthPriceProvider(ethPriceProvider);
    await this.crowdsale.setBtcPriceProvider(btcPriceProvider);

    //transfer more than totalTokens to test hardcap reach properly
    this.token.transfer(this.crowdsale.address, web3.toWei(totalTokens, "ether"));
  });

  it('should allow to halt by owner', async function () {
    await this.crowdsale.halt();

    const halted = await this.crowdsale.halted();

    assert.equal(halted, true);
  });

  it('should not allow to halt by not owner', async function () {
    try {
      await this.crowdsale.halt({from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow to halt if already halted', async function () {
    await this.crowdsale.halt();

    try {
      await this.crowdsale.halt();
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow to unhalt by owner', async function () {
    await this.crowdsale.halt();

    await this.crowdsale.unhalt();
    const halted = await this.crowdsale.halted();

    assert.equal(halted, false);
  });

  it('should not allow to unhalt when not halted', async function () {
    try {
      await this.crowdsale.unhalt();
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow to unhalt by not owner', async function () {
    await this.crowdsale.halt();

    try {
      await this.crowdsale.unhalt({from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow to update ETH price by ETH price provider', async function () {
    await this.crowdsale.receiveEthPrice(25000, {from: ethPriceProvider});

    const ethUsdRate = await this.crowdsale.ethUsdRate();

    assert.equal(ethUsdRate, 25000);
  });

  it('should allow to update BTC price by BTC price provider', async function () {
    await this.crowdsale.receiveBtcPrice(420000, {from: btcPriceProvider});

    const btcUsdRate = await this.crowdsale.btcUsdRate();

    assert.equal(btcUsdRate, 420000);
  });

  it('should not allow to update ETH price by not ETH price provider', async function () {
    try {
      await this.crowdsale.receiveEthPrice(25000, {from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow to update BTC price by not BTC price provider', async function () {
    try {
      await this.crowdsale.receiveBtcPrice(420000, {from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow to set BTC price provider by owner', async function () {
    await this.crowdsale.setBtcPriceProvider(accounts[2], {from: accounts[0]});

    const newPriceProvider = await this.crowdsale.btcPriceProvider();

    assert.equal(accounts[2], newPriceProvider);
  });

  it('should allow to set ETH price provider by owner', async function () {
    await this.crowdsale.setEthPriceProvider(accounts[2], {from: accounts[0]});

    const newPriceProvider = await this.crowdsale.ethPriceProvider();

    assert.equal(accounts[2], newPriceProvider);
  });

  it('should not allow to set BTC price provider by not owner', async function () {
    try {
      await this.crowdsale.setBtcPriceProvider(accounts[2], {from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow to set ETH price provider by not owner', async function () {
    try {
      await this.crowdsale.setEthPriceProvider(accounts[2], {from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow to update eth price with zero value', async function () {
    try {
      await this.crowdsale.receiveEthPrice(0, {from: ethPriceProvider});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow to update btc price with zero value', async function () {
    try {
      await this.crowdsale.receiveBtcPrice(0, {from: btcPriceProvider});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow to set new whitelist with zero value', async function () {
    try {
      await this.crowdsale.setNewWhiteList(0x0);
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow to set new whitelist by not owner', async function () {
    try {
      await this.crowdsale.setNewWhiteList(0x0, { from: accounts[1] });
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should set new whitelist', async function () {
    const newWhiteList = await InvestorWhiteList.new();
    await this.crowdsale.setNewWhiteList(newWhiteList.address);

    const actual = await this.crowdsale.investorWhiteList();
    assert.equal(newWhiteList.address, actual);
  });

  it('should send tokens to purchaser', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[2]});

    const balance = await this.token.balanceOf(accounts[2]);
    assert.equal(balance.valueOf(), 500 * 10**18);

    const crowdsaleBalance = await this.token.balanceOf(this.crowdsale.address);
    assert.equal(crowdsaleBalance.valueOf(), (totalTokens - 500) * 10 ** 18);

    const collected = await this.crowdsale.collected();
    assert.equal(collected.valueOf(), 1 * 10 ** 18);

    const investorCount = await this.crowdsale.investorCount();
    assert.equal(investorCount, 1);

    const tokensSold = await this.crowdsale.tokensSold();
    assert.equal(tokensSold.valueOf(), 500 * 10 ** 18);
  });

  it('should not allow purchase when pre sale is halted', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    await this.crowdsale.halt();

    try {
      await this.crowdsale.sendTransaction({value: 0.11 * 10 ** 18, from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow to exceed purchase limit token', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    const amount = tokenPriceUsd/baseEthUsdPrice * (totalTokens + 1) * 10 ** 18;

    try {
      await this.crowdsale.sendTransaction({value: amount, from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow to exceed purchase limit token', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    const amount = ((tokenPriceUsd * 10 ** 18)/baseEthUsdPrice) * totalTokens;
    await this.crowdsale.sendTransaction({value: amount, from: accounts[2]});
    const balance = await this.token.balanceOf(accounts[2]);
    assert.equal(balance.valueOf(), totalTokens * 10**18);
  });

  it('should set flag when softcap is reached', async function () {
    
    await this.whiteList.addInvestorToWhiteList(accounts[1]);
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    await this.crowdsale.sendTransaction({value: 25 * 10 ** 18, from: accounts[1]});
    await this.crowdsale.sendTransaction({value: 25 * 10 ** 18, from: accounts[2]});

    const softCapReached = await this.crowdsale.softCapReached();
    assert.equal(softCapReached, true);
  });

  it('should not allow purchase after withdraw', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[1]);
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    await this.crowdsale.sendTransaction({value: 25 * 10 ** 18, from: accounts[1]});
    await this.crowdsale.sendTransaction({value: 25 * 10 ** 18, from: accounts[2]});

    await this.crowdsale.withdraw();

    try {
      await this.crowdsale.sendTransaction({value: 0.11 * 10 ** 18, from: accounts[3]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow to exceed hard cap', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[1]);
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[1]});
    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[2]});

    try {
      await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[4]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow withdraw only for owner', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[1]);
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[1]});
    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[2]});

    try {
      await this.crowdsale.withdraw({from: accounts[1]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow withdraw when softcap is not reached', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[1]);

    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[1]});

    try {
      await this.crowdsale.withdraw();
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should withdraw - send all not distributed tokens and collected ETH to beneficiary', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[1]);
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    await this.crowdsale.sendTransaction({value: 19 * 10 ** 18, from: accounts[1]});
    await this.crowdsale.sendTransaction({value: 19 * 10 ** 18, from: accounts[2]});

    const oldBenBalanceEth = await web3.eth.getBalance(beneficiary);
    const oldBenBalancePza = await this.token.balanceOf(beneficiary);

    await this.crowdsale.withdraw();

    const newBenBalanceEth = await web3.eth.getBalance(beneficiary);
    const newBenBalancePza = await this.token.balanceOf(beneficiary);

    const preSaleContractBalancePza = await this.token.balanceOf(this.crowdsale.address);
    const preSaleContractBalanceEth = await web3.eth.getBalance(this.crowdsale.address);

    assert.equal(newBenBalanceEth.gt(oldBenBalanceEth), true);
    assert.equal(newBenBalancePza.gt(oldBenBalancePza), true);
    assert.equal(preSaleContractBalancePza, 0);
    assert.equal(preSaleContractBalanceEth, 0);
  });

  it('should not allow purchase if pre sale is ended', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    increaseTimestampBy(3600*24);

    try {
      await this.crowdsale.sendTransaction({value: 0.1 * 10 ** 18, from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow refund if pre sale is not ended', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[2]});

    try {
      await this.crowdsale.refund({from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow refund if cap is reached', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[1]);
    await this.whiteList.addInvestorToWhiteList(accounts[3]);

    await this.crowdsale.sendTransaction({value: 25 * 10 ** 18, from: accounts[1]});
    await this.crowdsale.sendTransaction({value: 25 * 10 ** 18, from: accounts[3]});

    increaseTimestampBy(3600*24);

    try {
      await this.crowdsale.refund({from: accounts[3]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow refund if pre sale is halted', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[1]);

    await this.crowdsale.sendTransaction({value: 25 * 10 ** 18, from: accounts[1]});

    increaseTimestampBy(3600*24);

    await this.crowdsale.halt();

    try {
      await this.crowdsale.refund({from: accounts[1]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should refund if cap is not reached and pre sale is ended', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);
    
    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[2]});

    increaseTimestampBy(3600*24);

    const balanceBefore = web3.eth.getBalance(accounts[2]);
    await this.crowdsale.refund({from: accounts[2]});

    const balanceAfter = web3.eth.getBalance(accounts[2]);
    assert.equal(balanceAfter > balanceBefore, true);

    const weiRefunded = await this.crowdsale.weiRefunded();
    assert.equal(weiRefunded, 1 * 10 ** 18);

    //should not refund 1 more time
    try {
      await this.crowdsale.refund({from: accounts[2]});
    } catch (error) {
     return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should send 5% referral bonus', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);
    await this.whiteList.addReferralOf(accounts[2], accounts[3]);

    await this.crowdsale.sendTransaction({
      value: 1 * 10 ** 18,
      from: accounts[2],
    });

    const balanceOf2 = await this.token.balanceOf(accounts[2]);
    assert.equal(balanceOf2.valueOf(), 500 * 10 ** 18);

    const balanceOf3 = await this.token.balanceOf(accounts[3]);
    assert.equal(balanceOf3.valueOf(), 25 * 10**18);
  });

  it('should not add referral bonus to tokensSold if no referral of investor', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    await this.crowdsale.sendTransaction({
      value: 1 * 10 ** 18,
      from: accounts[2],
    });

    //check that investor received proper tokens count
    const balanceOf2 = await this.token.balanceOf(accounts[2]);
    assert.equal(balanceOf2.valueOf(), 500 * 10 ** 18);

    //check that sender deposit was increased
    const deposited = await this.crowdsale.deposited(accounts[2]);
    assert.equal(deposited.toNumber(), 1 * 10 ** 18);

    //check that tokensSold is correct
    const tokensSold = await this.crowdsale.tokensSold();
    assert.equal(tokensSold.toNumber(), 500 * 10 ** 18);
  });
});
