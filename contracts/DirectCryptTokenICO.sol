pragma solidity ^0.4.11;

import "./Haltable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./DirectCryptToken.sol";
import "./InvestorWhiteList.sol";
import "./abstract/PriceReceiver.sol";

contract DirectCryptTokenICO is Haltable, PriceReceiver {
  using SafeMath for uint;

  string public constant name = "Direct Crypt Token ICO";

  uint public constant REFERRAL_MIN_LIMIT = 2 ether;

  DirectCryptToken public token;

  address public beneficiary;

  address public constant preSaleAddress = 0x949C9B8dFf9b264CAD57F69Cd98ECa1338F05B39;

  InvestorWhiteList public investorWhiteList;

  uint public constant drctUsdRate = 100; //in cents

  uint public ethUsdRate;

  uint public hardCap;
  uint public softCap;

  uint public collected = 0;
  uint public tokensSold = 0;
  uint public weiRefunded = 0;

  uint public startTime;
  uint public endTime;

  bool public softCapReached = false;
  bool public crowdsaleFinished = false;

  uint public endOfFirstPeriod;
  uint public endOfSecondPeriod;
  uint public endOfThirdPeriod;
  uint public endOfFourthPeriod;

  mapping (address => uint) public deposited;

  event SoftCapReached(uint softCap);
  event NewContribution(address indexed holder, uint tokenAmount, uint etherAmount);
  event NewReferralTransfer(address indexed investor, address indexed referral, uint tokenAmount);
  event Refunded(address indexed holder, uint amount);

  modifier icoActive() {
    require(block.timestamp >= startTime && block.timestamp < endTime);
    _;
  }

  modifier icoEnded() {
    require(block.timestamp >= endTime);
    _;
  }

  modifier minInvestment() {
    require(msg.value >= 0.1 * 1 ether);
    _;
  }

  modifier inWhiteList() {
    require(investorWhiteList.isAllowed(msg.sender));
    _;
  }

  function DirectCryptTokenICO(
    uint _hardCapETH,
    uint _softCapETH,

    address _token,
    address _beneficiary,
    address _investorWhiteList,

    uint _baseEthUsdPrice,

    uint _startTime,
    uint _endOfFirstPeriod,
    uint _endOfSecondPeriod,
    uint _endOfThirdPeriod,
    uint _endTime
  ) {
    hardCap = _hardCapETH.mul(1 ether);
    softCap = _softCapETH.mul(1 ether);

    token = DirectCryptToken(_token);
    beneficiary = _beneficiary;
    investorWhiteList = InvestorWhiteList(_investorWhiteList);

    startTime = _startTime;
    endOfFirstPeriod = _endOfFirstPeriod;
    endOfSecondPeriod = _endOfSecondPeriod;
    endOfThirdPeriod = _endOfThirdPeriod;
    endOfFourthPeriod = _endTime;
    endTime = _endTime;

    ethUsdRate = _baseEthUsdPrice;
  }

  function() payable minInvestment inWhiteList {
    doPurchase();
  }

  function refund() external icoEnded {
    require(softCapReached == false);
    require(deposited[msg.sender] > 0);

    uint refund = deposited[msg.sender];

    deposited[msg.sender] = 0;
    msg.sender.transfer(refund);

    weiRefunded = weiRefunded.add(refund);
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

  function setEthPriceProvider(address provider) external onlyOwner {
    require(provider != 0x0);
    ethPriceProvider = provider;
  }

  function setNewWhiteList(address newWhiteList) external onlyOwner {
    require(newWhiteList != 0x0);
    investorWhiteList = InvestorWhiteList(newWhiteList);
  }

  function transferOwnership(address newOwner) onlyOwner icoEnded {
    super.transferOwnership(newOwner);
  }

  function doPurchase() private icoActive inNormalState {
    require(!crowdsaleFinished);

    uint tokens = msg.value.mul(ethUsdRate).div(drctUsdRate);
    tokens = tokens.add(calculateBonus(tokens));

    uint newTokensSold = tokensSold.add(tokens);

    uint referralBonus = 0;
    if (msg.value >= REFERRAL_MIN_LIMIT) {
      referralBonus = calculateReferralBonus(tokens);
    }

    address referral = investorWhiteList.getReferralOf(msg.sender);

    if (referralBonus > 0 && referral != 0x0) {
      newTokensSold = newTokensSold.add(referralBonus);
    }

    require(collected.add(msg.value) <= hardCap);

    if (!softCapReached
      && collected < softCap
      && collected.add(msg.value) >= softCap
    ) {
      softCapReached = true;
      SoftCapReached(softCap);
    }

    collected = collected.add(msg.value);

    tokensSold = newTokensSold;

    deposited[msg.sender] = deposited[msg.sender].add(msg.value);

    token.transfer(msg.sender, tokens);
    NewContribution(msg.sender, tokens, msg.value);

    if (referralBonus > 0 && referral != 0x0) {
      token.transfer(referral, referralBonus);
      NewReferralTransfer(msg.sender, referral, referralBonus);
    }
  }

  function calculateReferralBonus(uint tokens) private returns(uint bonus) {
    return tokens.mul(5).div(100);
  }

  function calculateBonus(uint tokens) internal constant returns (uint bonus) {
    if (block.timestamp >= startTime && block.timestamp < endOfFirstPeriod) {
      return tokens.mul(75).div(100);
    } else if (block.timestamp >= endOfFirstPeriod && block.timestamp < endOfSecondPeriod) {
      return tokens.mul(50).div(100);
    } else if (block.timestamp >= endOfSecondPeriod && block.timestamp < endOfThirdPeriod) {
      return tokens.mul(25).div(100);
    } else if (block.timestamp >= endOfThirdPeriod && block.timestamp < endOfFourthPeriod) {
      return tokens.mul(0).div(100);
    }
  }
}
