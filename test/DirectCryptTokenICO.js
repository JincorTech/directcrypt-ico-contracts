const DirectCryptToken = artifacts.require("DirectCryptToken");
const DirectCryptTokenICO = artifacts.require("DirectCryptTokenICO");
const InvestorWhiteList = artifacts.require("InvestorWhiteList");

const assertJump = function(error) {
  assert.isAbove(error.message.search('VM Exception while processing transaction: revert'), -1, 'Invalid opcode error must be returned');
};

const hardCap = 133000; //in ETH
const softCap = 12500; //in ETH
const beneficiary = web3.eth.accounts[9];
const ethUsdPrice = 20000; //in cents
const ethPriceProvider = web3.eth.accounts[8];

async function increaseTimestampBy(seconds) {
  const jsonrpc = '2.0';
  const id = 0;
  const send = (method, params = []) => web3.currentProvider.send({id, jsonrpc, method, params});
  await send('evm_increaseTime', [seconds]);
  await send('evm_mine');
}

contract('DirectCryptTokenICO', function (accounts) {
  beforeEach(async function () {
    this.block = await web3.eth.getBlock(await web3.eth.blockNumber);
    this.startTime = this.block.timestamp;
    this.endOfFirstDecade = this.startTime + 3600*24*1;
    this.endOfSecondDecade = this.startTime + 3600*24*2;
    this.endOfThirdDecade = this.startTime + 3600*24*3;
    this.endOfFourthDecade = this.startTime + 3600*24*4;
    this.endTime = this.endOfFourthDecade;

    this.token = await DirectCryptToken.new();
    this.whiteList = await InvestorWhiteList.new();

    this.crowdsale = await DirectCryptTokenICO.new(
      hardCap,
      softCap,

      this.token.address,
      beneficiary,
      this.whiteList.address,

      ethUsdPrice,

      this.startTime,
      this.endOfFirstDecade,
      this.endOfSecondDecade,
      this.endOfThirdDecade,
      this.endTime
    );
    this.token.setTransferAgent(this.token.address, true);
    this.token.setTransferAgent(this.crowdsale.address, true);
    this.token.setTransferAgent(accounts[0], true);

    await this.crowdsale.setEthPriceProvider(ethPriceProvider);

    //transfer more than hardcap to test hardcap reach properly
    this.token.transfer(this.crowdsale.address, web3.toWei(30000000, "ether"));
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

  it('should not allow to update ETH price by not ETH price provider', async function () {
    try {
      await this.crowdsale.receiveEthPrice(25000, {from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow to set ETH price provider by owner', async function () {
    await this.crowdsale.setEthPriceProvider(accounts[2], {from: accounts[0]});

    const newPriceProvider = await this.crowdsale.ethPriceProvider();

    assert.equal(accounts[2], newPriceProvider);
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

  it('should not allow to transfer ownership if ICO is active', async function () {
    try {
      await this.crowdsale.transferOwnership(accounts[1]);
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow to transfer ownership when ICO is ended', async function () {
    await increaseTimestampBy(3600 * 24 * 4);

    await this.crowdsale.transferOwnership(accounts[1]);
    const actual = await this.crowdsale.owner();
    assert.equal(accounts[1], actual);
  });

  it('should increase deposit accordingly with several investments', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);
    await this.whiteList.addInvestorToWhiteList(accounts[3]);
    await this.whiteList.addReferralOf(accounts[3], accounts[4]);

    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[2]});

    const deposited1 = await this.crowdsale.deposited(accounts[2]);
    assert.equal(deposited1.toNumber(), 1 * 10 ** 18);

    await this.crowdsale.sendTransaction({value: 500 * 10 ** 18, from: accounts[2]});

    const deposited2 = await this.crowdsale.deposited(accounts[2]);
    assert.equal(deposited2.toNumber(), 501 * 10 ** 18);

    await this.crowdsale.sendTransaction({value: 500 * 10 ** 18, from: accounts[3]});

    const deposited3 = await this.crowdsale.deposited(accounts[3]);
    assert.equal(deposited3.toNumber(), 500 * 10 ** 18);

    //should not increase deposit of referral
    const deposited4 = await this.crowdsale.deposited(accounts[4]);
    assert.equal(deposited4.toNumber(), 0);
  });

  it('should not add referral bonus to tokensSold if no referral of investor', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    await this.crowdsale.sendTransaction({
      value: 100 * 10 ** 18,
      from: accounts[2],
    });

    //check that investor received proper tokens count
    const balanceOf2 = await this.token.balanceOf(accounts[2]);
    assert.equal(balanceOf2.valueOf(), 35000 * 10 ** 18);

    //check that sender deposit was increased
    const deposited = await this.crowdsale.deposited(accounts[2]);
    assert.equal(deposited.toNumber(), 100 * 10 ** 18);

    //check that tokensSold is correct
    const tokensSold = await this.crowdsale.tokensSold();
    assert.equal(tokensSold.toNumber(), 35000 * 10 ** 18);
  });

  it('should add 75% bonus and not send 5% referral bonus (first decade)', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);
    await this.whiteList.addReferralOf(accounts[2], accounts[3]);

    await this.whiteList.addInvestorToWhiteList(accounts[4]);
    await this.whiteList.addReferralOf(accounts[4], accounts[5]);

    await this.crowdsale.sendTransaction({
      value: 1 * 10 ** 18,
      from: accounts[2],
    });

    //check that investor received proper tokens count
    const balanceOf2 = await this.token.balanceOf(accounts[2]);
    assert.equal(balanceOf2.valueOf(), 350 * 10 ** 18);

    //check that sender deposit was increased
    const deposited = await this.crowdsale.deposited(accounts[2]);
    assert.equal(deposited.toNumber(), 1 * 10 ** 18);

    //check that correct referral bonus is received
    const balanceOf3 = await this.token.balanceOf(accounts[3]);
    assert.equal(balanceOf3.valueOf(), 0);

    //check that tokensSold is correct
    const tokensSold1 = await this.crowdsale.tokensSold();
    assert.equal(tokensSold1.toNumber(), 350 * 10 ** 18);
  });

  it('should add 75% bonus and send 5% referral bonus (first decade)', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);
    await this.whiteList.addReferralOf(accounts[2], accounts[3]);

    await this.whiteList.addInvestorToWhiteList(accounts[4]);
    await this.whiteList.addReferralOf(accounts[4], accounts[5]);

    await this.crowdsale.sendTransaction({
      value: 100 * 10 ** 18,
      from: accounts[2],
    });

    //check that investor received proper tokens count
    const balanceOf2 = await this.token.balanceOf(accounts[2]);
    assert.equal(balanceOf2.valueOf(), 35000 * 10 ** 18);

    //check that sender deposit was increased
    const deposited = await this.crowdsale.deposited(accounts[2]);
    assert.equal(deposited.toNumber(), 100 * 10 ** 18);

    //check that correct referral bonus is received
    const balanceOf3 = await this.token.balanceOf(accounts[3]);
    assert.equal(balanceOf3.valueOf(), 1750 * 10 ** 18);

    //check that tokensSold is correct
    const tokensSold1 = await this.crowdsale.tokensSold();
    assert.equal(tokensSold1.toNumber(), (35000 + 1750) * 10 ** 18);
  });

  it('should add 50% bonus and send 5% referral bonus (second decade)', async function () {
    await increaseTimestampBy(3600 * 24 * 1);
    await this.whiteList.addInvestorToWhiteList(accounts[2]);
    await this.whiteList.addReferralOf(accounts[2], accounts[3]);

    await this.whiteList.addInvestorToWhiteList(accounts[4]);
    await this.whiteList.addReferralOf(accounts[4], accounts[5]);

    await this.crowdsale.sendTransaction({
      value: 100 * 10 ** 18,
      from: accounts[2],
    });

    //check that investor received proper tokens count
    const balanceOf2 = await this.token.balanceOf(accounts[2]);
    assert.equal(balanceOf2.valueOf(), 30000 * 10 ** 18);

    //check that sender deposit was increased
    const deposited = await this.crowdsale.deposited(accounts[2]);
    assert.equal(deposited.toNumber(), 100 * 10 ** 18);

    //check that correct referral bonus is received
    const balanceOf3 = await this.token.balanceOf(accounts[3]);
    assert.equal(balanceOf3.valueOf(), 1500 * 10 ** 18);

    //check that tokensSold is correct
    const tokensSold1 = await this.crowdsale.tokensSold();
    assert.equal(tokensSold1.toNumber(), (30000 + 1500) * 10 ** 18);
  });

  it('should add 25% bonus and send 5% referral bonus (third decade)', async function () {
    await increaseTimestampBy(3600 * 24 * 2);
    await this.whiteList.addInvestorToWhiteList(accounts[2]);
    await this.whiteList.addReferralOf(accounts[2], accounts[3]);

    await this.whiteList.addInvestorToWhiteList(accounts[4]);
    await this.whiteList.addReferralOf(accounts[4], accounts[5]);

    await this.crowdsale.sendTransaction({
      value: 100 * 10 ** 18,
      from: accounts[2],
    });

    //check that investor received proper tokens count
    const balanceOf2 = await this.token.balanceOf(accounts[2]);
    assert.equal(balanceOf2.valueOf(), 25000 * 10 ** 18);

    //check that sender deposit was increased
    const deposited = await this.crowdsale.deposited(accounts[2]);
    assert.equal(deposited.toNumber(), 100 * 10 ** 18);

    //check that correct referral bonus is received
    const balanceOf3 = await this.token.balanceOf(accounts[3]);
    assert.equal(balanceOf3.valueOf(), 1250 * 10 ** 18);

    //check that tokensSold is correct
    const tokensSold1 = await this.crowdsale.tokensSold();
    assert.equal(tokensSold1.toNumber(), (25000 + 1250) * 10 ** 18);
  });

  it('should add 0% bonus and send 5% referral bonus (fourth decade)', async function () {
    await increaseTimestampBy(3600 * 24 * 3);
    await this.whiteList.addInvestorToWhiteList(accounts[2]);
    await this.whiteList.addReferralOf(accounts[2], accounts[3]);

    await this.whiteList.addInvestorToWhiteList(accounts[4]);
    await this.whiteList.addReferralOf(accounts[4], accounts[5]);

    await this.crowdsale.sendTransaction({
      value: 100 * 10 ** 18,
      from: accounts[2],
    });

    //check that investor received proper tokens count
    const balanceOf2 = await this.token.balanceOf(accounts[2]);
    assert.equal(balanceOf2.valueOf(), 20000 * 10 ** 18);

    //check that sender deposit was increased
    const deposited = await this.crowdsale.deposited(accounts[2]);
    assert.equal(deposited.toNumber(), 100 * 10 ** 18);

    //check that correct referral bonus is received
    const balanceOf3 = await this.token.balanceOf(accounts[3]);
    assert.equal(balanceOf3.valueOf(), 1000 * 10 ** 18);

    //check that tokensSold is correct
    const tokensSold1 = await this.crowdsale.tokensSold();
    assert.equal(tokensSold1.toNumber(), (20000 + 1000) * 10 ** 18);
  });

  it('should not allow purchase when ICO is halted', async function () {
    await this.crowdsale.halt();
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    try {
      await this.crowdsale.sendTransaction({value: 100 * 10 ** 18, from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should set flag when softcap is reached', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[1]);

    //ICO softcap will be reached with single 10417 ETH investment due to high volume bonus
    await this.crowdsale.sendTransaction({value: 12500*10**18, from: accounts[1]});

    const softCapReached = await this.crowdsale.softCapReached();
    assert.equal(softCapReached, true);
  });

  it('should not allow to exceed hard cap', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[1]);
    await this.whiteList.addInvestorToWhiteList(accounts[2]);
    await this.whiteList.addInvestorToWhiteList(accounts[4]);

    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[1]});
    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[2]});

    try {
      await this.crowdsale.sendTransaction({value: 133000 * 10 ** 18, from: accounts[4]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow withdraw only for owner', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[1]);

    await this.crowdsale.sendTransaction({value: 20000 * 10 ** 18, from: accounts[1]});

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

    await this.crowdsale.sendTransaction({value: 12000 * 10 ** 18, from: accounts[1]});
    await this.crowdsale.sendTransaction({value: 500 * 10 ** 18, from: accounts[2]});

    const oldBenBalanceEth = web3.eth.getBalance(beneficiary);
    const oldIcoContractBalancePza = await this.token.balanceOf(this.crowdsale.address).valueOf();

    await this.crowdsale.withdraw();

    const newBenBalanceEth = web3.eth.getBalance(beneficiary);
    const newBenBalancePza = await this.token.balanceOf(beneficiary).valueOf();
    const icoContractBalancePza = await this.token.balanceOf(this.crowdsale.address).valueOf();
    const icoContractBalanceEth = web3.eth.getBalance(this.crowdsale.address);

    assert.equal(icoContractBalancePza, 0);
    assert.equal(icoContractBalanceEth, 0);
    assert.equal(newBenBalanceEth.minus(oldBenBalanceEth).toNumber(), web3.toWei(12500));
    assert.equal(newBenBalancePza.toNumber(), oldIcoContractBalancePza.toNumber());
  });

  it('should not allow purchase if ICO is ended', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);
    await increaseTimestampBy(3600 * 24 * 4);

    try {
      await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow purchase after withdraw', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    await this.crowdsale.sendTransaction({value: 12500 * 10 ** 18, from: accounts[2]});
    await this.crowdsale.withdraw();

    try {
      await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow refund if ICO is not ended', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[2]});

    try {
      await this.crowdsale.refund({from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should not allow refund if soft cap is reached', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[1]);
    await this.whiteList.addInvestorToWhiteList(accounts[3]);

    await this.crowdsale.sendTransaction({value: 12000 * 10 ** 18, from: accounts[1]});
    await this.crowdsale.sendTransaction({value: 500 * 10 ** 18, from: accounts[3]});

    await increaseTimestampBy(3600 * 24 * 4);

    try {
      await this.crowdsale.refund({from: accounts[3]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });

  it('should allow refund if ICO is halted', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[1]);

    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[1]});

    await increaseTimestampBy(3600 * 24 * 4);
    await this.crowdsale.halt();

    const balanceBefore = web3.eth.getBalance(accounts[1]);

    await this.crowdsale.refund({from: accounts[1]});

    const balanceAfter = web3.eth.getBalance(accounts[1]);

    assert.equal(balanceAfter > balanceBefore, true);
  });

  it('should refund if cap is not reached and ICO is ended', async function () {
    await this.whiteList.addInvestorToWhiteList(accounts[2]);

    await this.crowdsale.sendTransaction({value: 1 * 10 ** 18, from: accounts[2]});

    await increaseTimestampBy(3600 * 24 * 4);

    const balanceBefore = web3.eth.getBalance(accounts[2]);
    await this.crowdsale.refund({from: accounts[2]});

    const balanceAfter = web3.eth.getBalance(accounts[2]);

    assert.equal(balanceAfter > balanceBefore, true);

    const weiRefunded = await this.crowdsale.weiRefunded();
    assert.equal(weiRefunded, 1 * 10 ** 18);

    const deposited = await this.crowdsale.deposited(accounts[2]);
    assert.equal(deposited.toNumber(), 0);
    //should not refund 1 more time
    try {
      await this.crowdsale.refund({from: accounts[2]});
    } catch (error) {
      return assertJump(error);
    }
    assert.fail('should have thrown before');
  });
});
