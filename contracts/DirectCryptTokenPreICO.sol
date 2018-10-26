pragma solidity ^0.4.11;

import "./Haltable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./DirectCryptToken.sol";
import "./InvestorWhiteList.sol";
import "./abstract/PriceReceiver.sol";


contract DirectCryptTokenPreICO is Haltable, PriceReceiver {
  using SafeMath for uint;

  string public constant name = "Direct Crypt Token PreICO";

  DirectCryptToken public token;
  InvestorWhiteList public investorWhiteList;

  address public beneficiary;

  uint public hardCap;
  uint public softCap;

  uint public ethUsdRate;
  uint public btcUsdRate;

  uint public tokenPriceUsd;
  uint public totalTokens;//in wei

  uint public collected = 0;
  uint public tokensSold = 0;
  uint public investorCount = 0;
  uint public weiRefunded = 0;

  uint public startTime;
  uint public endTime;

  bool public softCapReached = false;
  bool public crowdsaleFinished = false;

  mapping (address => bool) public refunded;
  mapping (address => uint) public deposited;

  event SoftCapReached(uint softCap);
  event NewContribution(address indexed holder, uint tokenAmount, uint etherAmount);
  event NewReferralTransfer(address indexed investor, address indexed referral, uint tokenAmount);
  event Refunded(address indexed holder, uint amount);
  event Deposited(address indexed holder, uint amount);
  event Amount(uint amount);

  modifier preSaleActive() {
    require(block.timestamp >= startTime && block.timestamp < endTime);
    _;
  }

  modifier preSaleEnded() {
    require(block.timestamp >= endTime);
    _;
  }

  modifier inWhiteList() {
    require(investorWhiteList.isAllowed(msg.sender));
    _;
  }

  function DirectCryptTokenPreICO(
    uint _hardCapETH,
    uint _softCapETH,

    address _token,
    address _beneficiary,
    address _investorWhiteList,

    uint _totalTokens,
    uint _tokenPriceUsd,

    uint _baseEthUsdPrice,
    uint _baseBtcUsdPrice,

    uint _startTime,
    uint _endTime
  ) {
    ethUsdRate = _baseEthUsdPrice;
    btcUsdRate = _baseBtcUsdPrice;
    tokenPriceUsd = _tokenPriceUsd;

    totalTokens = _totalTokens.mul(1 ether);

    hardCap = _hardCapETH.mul(1 ether);
    softCap = _softCapETH.mul(1 ether);

    token = DirectCryptToken(_token);
    investorWhiteList = InvestorWhiteList(_investorWhiteList);
    beneficiary = _beneficiary;

    startTime = _startTime;
    endTime = _endTime;
  }

  function() payable inWhiteList {
    doPurchase(msg.sender);
  }

  function refund() external preSaleEnded inNormalState {
    require(softCapReached == false);
    require(refunded[msg.sender] == false);

    uint refund = deposited[msg.sender];
    require(refund > 0);

    deposited[msg.sender] = 0;
    refunded[msg.sender] = true;
    weiRefunded = weiRefunded.add(refund);
    msg.sender.transfer(refund);
    Refunded(msg.sender, refund);
  }

  function withdraw() external onlyOwner {
    require(softCapReached);
    beneficiary.transfer(collected);
    token.transfer(beneficiary, token.balanceOf(this));
    crowdsaleFinished = true;
  }

  function receiveEthPrice(uint ethUsdPrice) external onlyEthPriceProvider {
    require(ethUsdPrice > 0);
    ethUsdRate = ethUsdPrice;
  }

  function receiveBtcPrice(uint btcUsdPrice) external onlyBtcPriceProvider {
    require(btcUsdPrice > 0);
    btcUsdRate = btcUsdPrice;
  }

  function setEthPriceProvider(address provider) external onlyOwner {
    require(provider != 0x0);
    ethPriceProvider = provider;
  }

  function setBtcPriceProvider(address provider) external onlyOwner {
    require(provider != 0x0);
    btcPriceProvider = provider;
  }

  function setNewWhiteList(address newWhiteList) external onlyOwner {
    require(newWhiteList != 0x0);
    investorWhiteList = InvestorWhiteList(newWhiteList);
  }

  function doPurchase(address _owner) private preSaleActive inNormalState {
    require(!crowdsaleFinished);
    require(collected.add(msg.value) <= hardCap);

    uint tokens = msg.value.mul(ethUsdRate).div(tokenPriceUsd);

    require(totalTokens >= tokensSold + tokens);

    if (!softCapReached
      && collected < softCap
      && collected.add(msg.value) >= softCap
    ) {
      softCapReached = true;
      SoftCapReached(softCap);
    }

    if (token.balanceOf(msg.sender) == 0) investorCount++;

    address referral = investorWhiteList.getReferralOf(msg.sender);
    uint referralBonus = calculateReferralBonus(tokens);

    uint newTokensSold = tokensSold.add(tokens);

    if (referralBonus > 0 && referral != 0x0) {
      newTokensSold = newTokensSold.add(referralBonus);
    }

    tokensSold = newTokensSold;

    collected = collected.add(msg.value);
    deposited[msg.sender] = deposited[msg.sender].add(msg.value);

    token.transfer(msg.sender, tokens);
    NewContribution(_owner, tokens, msg.value);

    if (referralBonus > 0 && referral != 0x0) {
      token.transfer(referral, referralBonus);
      NewReferralTransfer(msg.sender, referral, referralBonus);
    }
  }

  function calculateReferralBonus(uint tokens) private returns (uint) {
    return tokens.mul(5).div(100);
  }
}
